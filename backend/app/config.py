from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"
load_dotenv(PROJECT_ROOT / ".env", override=False)


def _project_path(value: str | None, default: Path) -> Path:
    candidate = Path(value).expanduser() if value else default
    return candidate.resolve() if candidate.is_absolute() else (PROJECT_ROOT / candidate).resolve()


@dataclass(frozen=True)
class Settings:
    model_path: Path
    model_labels_path: Path
    model_preprocessing_path: Path
    class_labels_path: Path
    disease_database_path: Path
    upload_storage_dir: Path
    mongodb_uri: str
    mongodb_database: str
    jwt_secret: str
    jwt_expire_minutes: int
    cors_origins: tuple[str, ...]
    max_upload_bytes: int
    max_image_pixels: int
    uncertainty_threshold: float
    uncertainty_margin: float
    model_version: str


def get_settings() -> Settings:
    model_path = _project_path(
        os.getenv("AGROVISION_MODEL_PATH"),
        BACKEND_DIR / "models" / "final_efficientnetv2b0_eca.keras",
    )
    origins = tuple(
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    )
    return Settings(
        model_path=model_path,
        model_labels_path=_project_path(
            os.getenv("AGROVISION_MODEL_LABELS_PATH"), model_path.parent / "class_labels.json"
        ),
        model_preprocessing_path=_project_path(
            os.getenv("AGROVISION_PREPROCESSING_CONFIG"),
            model_path.parent / "preprocessing_config.json",
        ),
        class_labels_path=_project_path(
            os.getenv("AGROVISION_CLASS_LABELS_PATH"), BACKEND_DIR / "class_labels.json"
        ),
        disease_database_path=_project_path(
            os.getenv("AGROVISION_DISEASE_DATABASE_PATH"), BACKEND_DIR / "disease_database.json"
        ),
        upload_storage_dir=_project_path(
            os.getenv("AGROVISION_IMAGE_STORAGE_DIR"), BACKEND_DIR / "storage" / "images"
        ),
        mongodb_uri=os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017"),
        mongodb_database=os.getenv("MONGODB_DATABASE", "agrovision"),
        jwt_secret=os.getenv("JWT_SECRET", ""),
        jwt_expire_minutes=max(5, int(os.getenv("JWT_EXPIRE_MINUTES", "60"))),
        cors_origins=origins,
        max_upload_bytes=max(1024, int(os.getenv("MAX_UPLOAD_BYTES", str(8 * 1024 * 1024)))),
        max_image_pixels=max(1024 * 1024, int(os.getenv("MAX_IMAGE_PIXELS", str(25_000_000)))),
        uncertainty_threshold=min(0.99, max(0.0, float(os.getenv("UNCERTAINTY_THRESHOLD", "0.60")))),
        uncertainty_margin=min(0.99, max(0.0, float(os.getenv("UNCERTAINTY_MARGIN", "0.03")))),
        model_version=os.getenv("AGROVISION_MODEL_VERSION", "efficientnetv2b0-eca-final"),
    )


settings = get_settings()
