from __future__ import annotations

from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from .security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_repository(request: Request) -> Any:
    repository = getattr(request.app.state, "repository", None)
    if repository is None:
        raise HTTPException(status_code=503, detail="Database is unavailable.")
    return repository


def get_model_service(request: Request) -> Any:
    service = getattr(request.app.state, "model_service", None)
    if service is None:
        raise HTTPException(status_code=503, detail="The final crop disease model is unavailable.")
    return service


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    repository: Any = Depends(get_repository),
) -> dict[str, str]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        identity = decode_access_token(credentials.credentials, request.app.state.settings)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is invalid or expired. Sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    user = repository.find_user_by_id(identity["user_id"])
    if user is None:
        raise HTTPException(status_code=401, detail="Account not found. Sign in again.")
    return {"user_id": str(user["_id"]), "email": str(user["email"])}
