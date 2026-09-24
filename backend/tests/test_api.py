from __future__ import annotations

import io
import json
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.config import settings
from backend.app.main import create_app
from backend.app.services.model_runtime import ModelService
from backend.app.services.recommendations import load_knowledge_base, localized_recommendation


ROOT = Path(__file__).resolve().parents[2]


class FakeClient:
    def close(self):
        pass


class MemoryRepository:
    def __init__(self):
        self.users = {}
        self.predictions = {}

    def create_user(self, document):
        self.users[document["_id"]] = dict(document)

    def find_user_by_email(self, email):
        return next((dict(user) for user in self.users.values() if user["email"] == email), None)

    def find_user_by_id(self, user_id):
        user = self.users.get(user_id)
        return dict(user) if user else None

    def create_prediction(self, document):
        self.predictions[document["prediction_id"]] = dict(document)

    def get_prediction(self, user_id, prediction_id):
        doc = self.predictions.get(prediction_id)
        if doc is None or doc["user_id"] != user_id:
            return None
        return dict(doc)

    def list_predictions(self, user_id, skip, limit):
        docs = [doc for doc in self.predictions.values() if doc["user_id"] == user_id]
        docs.sort(key=lambda doc: doc["created_at"], reverse=True)
        return [dict(doc) for doc in docs[skip:skip + limit]]

    def count_predictions(self, user_id):
        return sum(doc["user_id"] == user_id for doc in self.predictions.values())

    def delete_prediction(self, user_id, prediction_id):
        doc = self.get_prediction(user_id, prediction_id)
        if doc is not None:
            del self.predictions[prediction_id]
        return doc


class FakeModel:
    def __init__(self):
        with (ROOT / "backend" / "class_labels.json").open(encoding="utf-8") as stream:
            self.class_labels = {int(key): value for key, value in json.load(stream).items()}
        self.model_version = "test-model"

    def predict(self, batch):
        self.last_shape = batch.shape
        result = np.zeros(38, dtype=np.float32)
        result[3] = 0.92
        result[0] = 0.05
        result[1] = 0.03
        return result


def jpeg_bytes() -> bytes:
    stream = io.BytesIO()
    Image.new("RGB", (48, 48), color=(60, 120, 70)).save(stream, format="JPEG")
    return stream.getvalue()


class RecommendationTests(unittest.TestCase):
    def test_all_canonical_classes_have_bilingual_recommendation_content(self):
        labels_path = ROOT / "backend" / "class_labels.json"
        with labels_path.open(encoding="utf-8") as stream:
            labels = {int(key): value for key, value in json.load(stream).items()}
        guide = load_knowledge_base(ROOT / "backend" / "disease_database.json", labels)
        with (ROOT / "backend" / "disease_sources.json").open(encoding="utf-8") as stream:
            sources = json.load(stream)
        self.assertEqual(len(guide), 38)
        self.assertEqual(set(sources), set(labels.values()))
        self.assertTrue(all(refs and all(ref.get("url", "").startswith("https://") for ref in refs) for refs in sources.values()))
        self.assertIn("Corn_(maize)___healthy", guide)
        self.assertNotIn("Corn___healthy", guide)
        for label in labels.values():
            for locale in ("en", "te"):
                entry = guide[label][locale]
                result = localized_recommendation(label, locale, guide)
                self.assertTrue(entry["description"].strip())
                self.assertTrue(entry["symptoms"])
                self.assertTrue(entry["recommended_practices"])
                self.assertEqual(result["symptoms"], entry["symptoms"])
                self.assertEqual(result["recommended_practices"], entry["recommended_practices"])
                self.assertEqual(result["prevention"], entry["prevention"])
                self.assertEqual(result["treatment"], entry["treatment"])
                self.assertEqual(result["organic_options"], entry["organic"])
                self.assertEqual(result["severity"], entry["severity"])
            if label.endswith("___healthy"):
                self.assertIsNone(guide[label]["en"]["severity"])
                self.assertIsNone(guide[label]["te"]["severity"])
                self.assertIn("No disease symptoms detected.", guide[label]["en"]["symptoms"])
                self.assertIn("వ్యాధి లక్షణాలు కనిపించడం లేదు.", guide[label]["te"]["symptoms"])
            else:
                self.assertTrue(guide[label]["en"]["severity"])
                self.assertTrue(guide[label]["te"]["severity"])


class ApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.storage = Path(self.tempdir.name) / "images"
        self.repository = MemoryRepository()
        self.model = FakeModel()
        test_settings = replace(
            settings,
            jwt_secret="unit-test-secret-that-is-at-least-32-bytes-long",
            upload_storage_dir=self.storage,
            disease_database_path=ROOT / "backend" / "disease_database.json",
            class_labels_path=ROOT / "backend" / "class_labels.json",
            cors_origins=("http://testserver",),
        )
        self.app = create_app(
            settings_override=test_settings,
            model_loader=lambda _settings: self.model,
            repository_connector=lambda _settings: (FakeClient(), self.repository),
        )
        self.client = TestClient(self.app)
        self.client.__enter__()

    def tearDown(self):
        self.client.__exit__(None, None, None)
        self.tempdir.cleanup()

    def register(self, email):
        response = self.client.post("/api/auth/register", json={"email": email, "password": "secure-password-123"})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["access_token"]

    def test_authenticated_analysis_history_and_owner_scoping(self):
        token_a = self.register("farmer@example.com")
        token_b = self.register("other@example.com")
        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        response = self.client.post(
            "/api/predictions/analyze?language=en",
            headers=headers_a,
            files={"file": ("leaf.jpg", jpeg_bytes(), "image/jpeg")},
        )
        self.assertEqual(response.status_code, 201, response.text)
        prediction = response.json()
        self.assertEqual(prediction["class_id"], 3)
        self.assertEqual(prediction["status"], "healthy")
        self.assertEqual(prediction["recommendations"]["symptoms"], ["No disease symptoms detected."])
        self.assertTrue(prediction["recommendations"]["recommended_practices"])
        self.assertIsNone(prediction["recommendations"]["severity"])
        self.assertEqual(len(prediction["top_predictions"]), 3)
        self.assertAlmostEqual(prediction["top_predictions"][0]["probability"], 0.92)
        self.assertEqual(self.model.last_shape, (1, 224, 224, 3))
        telugu_prediction = self.client.get(
            f"/api/predictions/{prediction['prediction_id']}?language=te",
            headers=headers_a,
        )
        self.assertEqual(telugu_prediction.status_code, 200)
        self.assertIn("వ్యాధి లక్షణాలు కనిపించడం లేదు.", telugu_prediction.json()["recommendations"]["symptoms"])
        self.assertTrue((self.storage / self.repository.find_user_by_email("farmer@example.com")["_id"] / f"{prediction['prediction_id']}.jpg").is_file())
        own_image = self.client.get(prediction["image_url"], headers=headers_a)
        other_image = self.client.get(prediction["image_url"], headers=headers_b)
        self.assertEqual(own_image.status_code, 200)
        self.assertEqual(own_image.headers["content-type"], "image/jpeg")
        self.assertEqual(other_image.status_code, 404)

        owner_history = self.client.get("/api/predictions/history", headers=headers_a)
        other_history = self.client.get("/api/predictions/history", headers=headers_b)
        self.assertEqual(owner_history.json()["total"], 1)
        self.assertEqual(other_history.json()["total"], 0)
        forbidden = self.client.get(f"/api/predictions/{prediction['prediction_id']}", headers=headers_b)
        self.assertEqual(forbidden.status_code, 404)

        removed = self.client.delete(f"/api/predictions/{prediction['prediction_id']}", headers=headers_a)
        self.assertEqual(removed.status_code, 200)
        self.assertTrue(removed.json()["deleted"])
        self.assertEqual(self.client.get("/api/predictions/history", headers=headers_a).json()["total"], 0)

    def test_authentication_and_invalid_image_errors_use_http_statuses(self):
        unauthenticated = self.client.get("/api/predictions/history")
        self.assertEqual(unauthenticated.status_code, 401)
        token = self.register("farmer2@example.com")
        invalid = self.client.post(
            "/api/predictions/analyze",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("broken.jpg", b"not-an-image", "image/jpeg")},
        )
        self.assertEqual(invalid.status_code, 422)

    def test_health_reports_ready_with_injected_services(self):
        health = self.client.get("/api/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json()["status"], "ok")

    def test_duplicate_registration_returns_conflict(self):
        token = self.register("duplicate@example.com")
        duplicate = self.client.post(
            "/api/auth/register",
            json={"email": "DUPLICATE@example.com", "password": "secure-password-456"},
        )
        self.assertTrue(token)
        self.assertEqual(duplicate.status_code, 409)


class ModelArtifactTests(unittest.TestCase):
    def test_loader_refuses_to_fall_back_when_final_artifact_is_missing(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            missing_settings = replace(
                settings,
                model_path=folder / "final.keras",
                model_labels_path=folder / "class_labels.json",
                model_preprocessing_path=folder / "preprocessing_config.json",
            )
            with self.assertRaisesRegex(FileNotFoundError, "historical H5 is not used"):
                ModelService.load(missing_settings)


class GracefulStartupTests(unittest.TestCase):
    def test_missing_final_model_keeps_api_up_but_disables_analysis(self):
        repository = MemoryRepository()
        temporary_storage = tempfile.TemporaryDirectory()
        self.addCleanup(temporary_storage.cleanup)
        test_settings = replace(
            settings,
            jwt_secret="unit-test-secret-that-is-at-least-32-bytes-long",
            upload_storage_dir=Path(temporary_storage.name) / "images",
            disease_database_path=ROOT / "backend" / "disease_database.json",
            class_labels_path=ROOT / "backend" / "class_labels.json",
        )

        def missing_model(_settings):
            raise FileNotFoundError("final artifact is missing")

        app = create_app(
            settings_override=test_settings,
            model_loader=missing_model,
            repository_connector=lambda _settings: (FakeClient(), repository),
        )
        with TestClient(app) as client:
            health = client.get("/api/health").json()
            self.assertEqual(health["status"], "degraded")
            self.assertEqual(health["components"]["model"], "unavailable")
            auth = client.post(
                "/api/auth/register",
                json={"email": "ready@example.com", "password": "secure-password-789"},
            )
            self.assertEqual(auth.status_code, 201)
            response = client.post(
                "/api/predictions/analyze",
                headers={"Authorization": f"Bearer {auth.json()['access_token']}"},
                files={"file": ("leaf.jpg", jpeg_bytes(), "image/jpeg")},
            )
            self.assertEqual(response.status_code, 503)


if __name__ == "__main__":
    unittest.main()
