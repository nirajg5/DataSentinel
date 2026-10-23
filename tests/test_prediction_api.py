
from datetime import datetime

from fastapi.testclient import TestClient

from backend.main import app
from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.prediction.routes import router as prediction_router


class FakeUser:
    role = ADMIN


class FakeQuery:
    def filter(self, condition):
        return self

    def order_by(self, ordering):
        return self

    def limit(self, count):
        self.count = count
        return self

    def all(self):
        record = type(
            "Prediction",
            (),
            {
                "id": 2,
                "dataset_name": "bronze_customers",
                "failure_probability": 0.2045,
                "risk_level": "LOW",
                "predicted_failure": False,
                "predicted_at": datetime(2026, 10, 21),
            },
        )()
        return [record][:self.count]


class FakeDB:
    def query(self, model):
        return FakeQuery()


def history_role_dependency():
    endpoint = next(
        route.endpoint
        for route in prediction_router.routes
        if getattr(route, "path", None)
        == "/predictions/failure/{dataset_name}/history"
    )
    route = next(
        route
        for route in prediction_router.routes
        if getattr(route, "endpoint", None) is endpoint
    )
    return next(
        dependency.call
        for dependency in route.dependant.dependencies
        if dependency.call is not get_db
    )


def setup_test_overrides():
    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = lambda: FakeDB()
    app.dependency_overrides[history_role_dependency()] = lambda: FakeUser()


def teardown_test_overrides():
    app.dependency_overrides.clear()


def test_history_endpoint_returns_predictions():
    setup_test_overrides()
    try:
        with TestClient(app) as client:
            response = client.get(
                "/predictions/failure/bronze_customers/history?limit=20"
            )

        assert response.status_code == 200
        body = response.json()
        assert body["dataset_name"] == "bronze_customers"
        assert body["count"] == 1
        assert body["predictions"][0]["risk_level"] == "LOW"
    finally:
        teardown_test_overrides()


def test_history_endpoint_rejects_unsupported_dataset():
    setup_test_overrides()
    try:
        with TestClient(app) as client:
            response = client.get(
                "/predictions/failure/unknown_dataset/history"
            )

        assert response.status_code == 400
    finally:
        teardown_test_overrides()


def test_history_endpoint_rejects_invalid_limit():
    setup_test_overrides()
    try:
        with TestClient(app) as client:
            response = client.get(
                "/predictions/failure/bronze_customers/history?limit=101"
            )

        assert response.status_code == 422
    finally:
        teardown_test_overrides()
