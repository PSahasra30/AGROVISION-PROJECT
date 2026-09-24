from __future__ import annotations

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any, Callable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, settings as default_settings
from .routers import auth, health, predictions
from .services.model_runtime import ModelService
from .services.recommendations import load_knowledge_base

logger = logging.getLogger(__name__)


def create_app(
    settings_override: Settings | None = None,
    model_loader: Callable[[Settings], Any] | None = None,
    repository_connector: Callable[[Settings], tuple[Any, Any]] | None = None,
) -> FastAPI:
    app_settings = settings_override or default_settings
    load_model = model_loader or ModelService.load
    if repository_connector is None:
        from .database import connect_repository

        connect_repository_fn = connect_repository
    else:
        connect_repository_fn = repository_connector

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.settings = app_settings
        application.state.model_service = None
        application.state.repository = None
        application.state.mongo_client = None
        application.state.knowledge_base = None
        application.state.model_labels = {}
        application.state.components = {
            "model": "unavailable",
            "database": "unavailable",
            "recommendations": "unavailable",
            "authentication": "ready" if len(app_settings.jwt_secret.encode("utf-8")) >= 32 else "unavailable",
        }
        try:
            with app_settings.class_labels_path.open(encoding="utf-8") as stream:
                application.state.model_labels = {int(key): str(value) for key, value in json.load(stream).items()}
            application.state.knowledge_base = load_knowledge_base(
                app_settings.disease_database_path, application.state.model_labels
            )
            application.state.components["recommendations"] = "ready"
        except Exception as exc:
            logger.error("Canonical labels/recommendations unavailable (%s)", type(exc).__name__)
        try:
            application.state.model_service = await asyncio.to_thread(load_model, app_settings)
            application.state.model_labels = application.state.model_service.class_labels
            application.state.components["model"] = "ready"
        except Exception as exc:
            # Include the loader's clear, non-secret diagnostic (usually an artifact path or shape).
            logger.error("Final model unavailable (%s): %s", type(exc).__name__, str(exc))
        try:
            client, repository = await asyncio.to_thread(connect_repository_fn, app_settings)
            application.state.mongo_client = client
            application.state.repository = repository
            application.state.components["database"] = "ready"
        except Exception as exc:
            # Driver exception text may contain the configured URI, so log only its type.
            logger.error("MongoDB unavailable (%s); database endpoints will return HTTP 503", type(exc).__name__)
        try:
            app_settings.upload_storage_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            logger.exception("Image storage directory could not be created")

        try:
            yield
        finally:
            client = application.state.mongo_client
            if client is not None:
                client.close()

    application = FastAPI(
        title="AgroVision API",
        description="Authenticated crop disease inference and user-scoped prediction history.",
        version="2.0.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(app_settings.cors_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(health.router)
    application.include_router(auth.router)
    application.include_router(predictions.router)

    @application.get("/")
    def root() -> dict[str, str]:
        return {"service": "AgroVision API", "health": "/api/health", "docs": "/docs"}

    return application


app = create_app()
