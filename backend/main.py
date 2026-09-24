"""Uvicorn entry point: run ``uvicorn backend.main:app`` from the repository root."""

from backend.app.main import app

__all__ = ["app"]
