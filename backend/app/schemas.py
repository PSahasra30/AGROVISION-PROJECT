from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 128:
            raise ValueError("Password must be at most 128 UTF-8 bytes.")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class UserResponse(BaseModel):
    user_id: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserResponse


class TopPrediction(BaseModel):
    class_id: int
    disease: str
    probability: float = Field(ge=0.0, le=1.0)


class RecommendationResponse(BaseModel):
    disease_id: str
    crop: str
    disease: str
    description: str | None = None
    symptoms: list[str] | None = None
    prevention: str | None = None
    recommended_practices: list[str] | None = None
    treatment: str | None = None
    organic_options: str | None = None
    severity: str | None = None
    disclaimer: str


class PredictionResponse(BaseModel):
    prediction_id: str
    disease: str
    class_id: int
    confidence: float = Field(ge=0.0, le=1.0)
    status: Literal["healthy", "diseased", "uncertain"]
    top_predictions: list[TopPrediction]
    model_version: str
    created_at: datetime
    image_url: str
    recommendations: RecommendationResponse
    message_code: str | None = None


class HistoryResponse(BaseModel):
    items: list[PredictionResponse]
    page: int
    limit: int
    total: int


class DeleteResponse(BaseModel):
    deleted: bool


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    components: dict[str, str]
    model_version: str
