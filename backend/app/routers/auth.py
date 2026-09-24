from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pymongo.errors import DuplicateKeyError

from ..dependencies import get_current_user, get_repository
from ..schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def _issue_auth(user: dict[str, Any], request: Request) -> AuthResponse:
    settings = request.app.state.settings
    try:
        token = create_access_token(str(user["_id"]), str(user["email"]), settings)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Authentication is not configured on this server.") from exc
    return AuthResponse(
        access_token=token,
        expires_in=settings.jwt_expire_minutes * 60,
        user=UserResponse(user_id=str(user["_id"]), email=str(user["email"])),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, request: Request, repository: Any = Depends(get_repository)) -> AuthResponse:
    if len(request.app.state.settings.jwt_secret.encode("utf-8")) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured on this server.")
    if repository.find_user_by_email(body.email) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = {
        "_id": str(uuid.uuid4()),
        "email": body.email,
        "password_hash": hash_password(body.password),
    }
    try:
        repository.create_user(user)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=409, detail="An account with this email already exists.") from exc
    return _issue_auth(user, request)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, request: Request, repository: Any = Depends(get_repository)) -> AuthResponse:
    user = repository.find_user_by_email(body.email)
    if user is None or not verify_password(body.password, str(user.get("password_hash", ""))):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    return _issue_auth(user, request)


@router.get("/me", response_model=UserResponse)
def me(user: dict[str, str] = Depends(get_current_user)) -> UserResponse:
    return UserResponse(user_id=user["user_id"], email=user["email"])
