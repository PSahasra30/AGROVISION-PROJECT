from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool

from ..dependencies import get_current_user, get_model_service, get_repository
from ..schemas import (
    DeleteResponse,
    HistoryResponse,
    PredictionResponse,
    RecommendationResponse,
    TopPrediction,
)
from ..services.image_processing import InvalidImageError, decode_and_preprocess
from ..services.recommendations import localized_recommendation

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/predictions", tags=["predictions"])


def _locale(value: str) -> str:
    return "te" if value.lower() == "te" else "en"


def _make_response(document: dict[str, Any], language: str, request: Request) -> PredictionResponse:
    knowledge_base = request.app.state.knowledge_base
    if knowledge_base is None:
        raise HTTPException(status_code=503, detail="Disease recommendations are unavailable.")
    labels: dict[int, str] = request.app.state.model_labels
    label = labels[int(document["class_id"])]
    top = [
        TopPrediction(
            class_id=int(item["class_id"]),
            disease=labels[int(item["class_id"])],
            probability=float(item["probability"]),
        )
        for item in document["top_predictions"]
    ]
    recommendation = localized_recommendation(label, language, knowledge_base)
    return PredictionResponse(
        prediction_id=str(document["prediction_id"]),
        disease=label,
        class_id=int(document["class_id"]),
        confidence=float(document["confidence"]),
        status=document["status"],
        top_predictions=top,
        model_version=str(document["model_version"]),
        created_at=document["created_at"],
        image_url=f"/api/predictions/{document['prediction_id']}/image",
        recommendations=RecommendationResponse(**recommendation),
        message_code=document.get("message_code"),
    )


def _image_path(root: Path, user_id: str, relative_path: str) -> Path:
    base = root.resolve()
    path = (base / user_id / relative_path).resolve()
    if not path.is_relative_to(base) or not path.is_file():
        raise HTTPException(status_code=404, detail="Image not found.")
    return path


@router.post("/analyze", response_model=PredictionResponse, status_code=201)
async def analyze(
    request: Request,
    file: UploadFile = File(...),
    language: str = Query("en", max_length=5),
    user: dict[str, str] = Depends(get_current_user),
    repository: Any = Depends(get_repository),
    model_service: Any = Depends(get_model_service),
) -> PredictionResponse:
    settings = request.app.state.settings
    if request.app.state.knowledge_base is None:
        raise HTTPException(status_code=503, detail="Disease recommendations are unavailable.")
    try:
        contents = await file.read(settings.max_upload_bytes + 1)
    finally:
        await file.close()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Image exceeds the 8 MB upload limit.")
    try:
        processed = await run_in_threadpool(
            decode_and_preprocess, contents, settings.max_image_pixels, target_size=224
        )
    except InvalidImageError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    probabilities = await run_in_threadpool(model_service.predict, processed.model_input)
    if probabilities.shape != (38,) or not np.isfinite(probabilities).all():
        raise HTTPException(status_code=503, detail="The model returned an invalid result.")
    order = np.argsort(probabilities)[::-1][:3]
    class_id = int(order[0])
    confidence = float(probabilities[class_id])
    margin = confidence - float(probabilities[int(order[1])])
    if confidence < settings.uncertainty_threshold or margin < settings.uncertainty_margin:
        prediction_status = "uncertain"
        message_code = "uncertain"
    else:
        prediction_status = "healthy" if model_service.class_labels[class_id].endswith("___healthy") else "diseased"
        message_code = None

    prediction_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    relative_image_path = f"{prediction_id}.jpg"
    user_dir = (settings.upload_storage_dir / user["user_id"]).resolve()
    storage_root = settings.upload_storage_dir.resolve()
    if not user_dir.is_relative_to(storage_root):
        raise HTTPException(status_code=400, detail="Invalid user storage path.")
    user_dir.mkdir(parents=True, exist_ok=True)
    preview_path = user_dir / relative_image_path
    document = {
        "prediction_id": prediction_id,
        "user_id": user["user_id"],
        "class_id": class_id,
        "confidence": confidence,
        "status": prediction_status,
        "message_code": message_code,
        "top_predictions": [
            {"class_id": int(index), "probability": float(probabilities[index])}
            for index in order
        ],
        "model_version": model_service.model_version,
        "created_at": created_at,
        "image_relative_path": relative_image_path,
    }
    try:
        preview_path.write_bytes(processed.preview_bytes)
        await run_in_threadpool(repository.create_prediction, document)
    except Exception:
        preview_path.unlink(missing_ok=True)
        raise
    return _make_response(document, _locale(language), request)


@router.get("/history", response_model=HistoryResponse)
def history(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    language: str = Query("en", max_length=5),
    user: dict[str, str] = Depends(get_current_user),
    repository: Any = Depends(get_repository),
) -> HistoryResponse:
    documents = repository.list_predictions(user["user_id"], skip=(page - 1) * limit, limit=limit)
    return HistoryResponse(
        items=[_make_response(document, _locale(language), request) for document in documents],
        page=page,
        limit=limit,
        total=repository.count_predictions(user["user_id"]),
    )


@router.get("/{prediction_id}/image")
def prediction_image(
    prediction_id: str,
    request: Request,
    user: dict[str, str] = Depends(get_current_user),
    repository: Any = Depends(get_repository),
) -> FileResponse:
    document = repository.get_prediction(user["user_id"], prediction_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    path = _image_path(request.app.state.settings.upload_storage_dir, user["user_id"], document["image_relative_path"])
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, no-store"})


@router.get("/{prediction_id}", response_model=PredictionResponse)
def get_prediction(
    prediction_id: str,
    request: Request,
    language: str = Query("en", max_length=5),
    user: dict[str, str] = Depends(get_current_user),
    repository: Any = Depends(get_repository),
) -> PredictionResponse:
    document = repository.get_prediction(user["user_id"], prediction_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    return _make_response(document, _locale(language), request)


@router.delete("/{prediction_id}", response_model=DeleteResponse)
def delete_prediction(
    prediction_id: str,
    request: Request,
    user: dict[str, str] = Depends(get_current_user),
    repository: Any = Depends(get_repository),
) -> DeleteResponse:
    document = repository.delete_prediction(user["user_id"], prediction_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    try:
        _image_path(
            request.app.state.settings.upload_storage_dir,
            user["user_id"],
            document["image_relative_path"],
        ).unlink(missing_ok=True)
    except HTTPException:
        logger.warning("Prediction %s was deleted but its image file was missing.", prediction_id)
    return DeleteResponse(deleted=True)
