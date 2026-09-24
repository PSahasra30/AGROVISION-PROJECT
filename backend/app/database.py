from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pymongo import DESCENDING, MongoClient


class MongoRepository:
    """Small repository around the two application collections."""

    def __init__(self, database: Any):
        self.users = database["users"]
        self.predictions = database["predictions"]

    def create_user(self, document: dict[str, Any]) -> None:
        self.users.insert_one(document)

    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        return self.users.find_one({"email": email})

    def find_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self.users.find_one({"_id": user_id})

    def create_prediction(self, document: dict[str, Any]) -> None:
        stored = dict(document)
        stored["_id"] = stored["prediction_id"]
        self.predictions.insert_one(stored)

    @staticmethod
    def _public_prediction(document: dict[str, Any] | None) -> dict[str, Any] | None:
        if document is None:
            return None
        result = dict(document)
        result["prediction_id"] = str(result.pop("_id", result.get("prediction_id")))
        return result

    def get_prediction(self, user_id: str, prediction_id: str) -> dict[str, Any] | None:
        doc = self.predictions.find_one({"_id": prediction_id, "user_id": user_id})
        return self._public_prediction(doc)

    def list_predictions(self, user_id: str, skip: int, limit: int) -> list[dict[str, Any]]:
        cursor = self.predictions.find({"user_id": user_id}).sort("created_at", DESCENDING).skip(skip).limit(limit)
        return [self._public_prediction(document) for document in cursor]

    def count_predictions(self, user_id: str) -> int:
        return int(self.predictions.count_documents({"user_id": user_id}))

    def delete_prediction(self, user_id: str, prediction_id: str) -> dict[str, Any] | None:
        # find_one_and_delete always returns the removed document.
        doc = self.predictions.find_one_and_delete({"_id": prediction_id, "user_id": user_id})
        return self._public_prediction(doc)


def connect_repository(settings):
    client = MongoClient(
        settings.mongodb_uri,
        serverSelectionTimeoutMS=2500,
        connectTimeoutMS=2500,
        tz_aware=True,
    )
    client.admin.command("ping")
    database = client[settings.mongodb_database]
    repository = MongoRepository(database)
    repository.users.create_index("email", unique=True, name="user_email_unique")
    repository.predictions.create_index(
        [("user_id", 1), ("created_at", DESCENDING)], name="user_prediction_history"
    )
    repository.predictions.create_index(
        [("user_id", 1), ("prediction_id", 1)], unique=True, name="user_prediction_lookup"
    )
    return client, repository


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
