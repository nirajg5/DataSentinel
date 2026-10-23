
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import get_current_user
from backend.prediction import routes as prediction_routes


class FakeUser:
    def __init__(self, role):
        self.role = role


def clear_overrides():
    app.dependency_overrides.clear()


def test_prediction_history_requires_authentication():
    clear_overrides()

    try:
        with TestClient(app) as client:
            response = client.get(
                "/predictions/failure/bronze_customers/history"
            )

        assert response.status_code == 401
    finally:
        clear_overrides()


def test_prediction_history_forbidden_for_unauthorized_role():
    clear_overrides()
    app.dependency_overrides[get_current_user] = (
        lambda: FakeUser(role="VIEWER")
    )

    try:
        with TestClient(app) as client:
            response = client.get(
                "/predictions/failure/bronze_customers/history"
            )

        assert response.status_code == 403
        assert response.json()["detail"] == "Insufficient permissions"
    finally:
        clear_overrides()


def test_prediction_history_allowed_for_data_engineer(monkeypatch):
    clear_overrides()
    app.dependency_overrides[get_current_user] = (
        lambda: FakeUser(role=DATA_ENGINEER)
    )
    monkeypatch.setattr(
        prediction_routes,
        "get_prediction_history",
        lambda dataset_name, db, limit: [],
    )

    try:
        with TestClient(app) as client:
            response = client.get(
                "/predictions/failure/bronze_customers/history"
            )

        assert response.status_code == 200
        assert response.json()["count"] == 0
    finally:
        clear_overrides()


def test_model_status_returns_service_unavailable_when_artifacts_missing(
    monkeypatch,
):
    clear_overrides()
    app.dependency_overrides[get_current_user] = (
        lambda: FakeUser(role=ADMIN)
    )

    def missing_artifacts():
        raise FileNotFoundError("Model artifacts are missing")

    monkeypatch.setattr(
        prediction_routes,
        "load_model_artifacts",
        missing_artifacts,
    )

    try:
        with TestClient(app) as client:
            response = client.get("/predictions/failure/model-status")

        assert response.status_code == 503
        assert response.json()["detail"] == "Model artifacts are missing"
    finally:
        clear_overrides()
