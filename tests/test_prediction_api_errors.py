
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth.constants import ADMIN
from backend.auth.dependencies import get_current_user
from backend.database.dependencies import get_db
from backend.prediction import routes as prediction_routes


class FakeUser:
    role = ADMIN


@pytest.fixture
def client():
    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    app.dependency_overrides[get_db] = lambda: object()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def valid_payload():
    return {
        "pipeline_name": "bronze_csv_ingestion",
        "hour_of_day": 10,
        "day_of_week": 3,
        "expected_rows": 200,
        "source_freshness_lag_minutes": 5,
        "upstream_failures_24h": 0,
        "failures_last_10_runs": 0,
        "success_streak_before_run": 5,
        "schema_change_detected": 0,
        "null_rate_last_run": 0.01,
        "duplicate_rate_last_run": 0.01,
        "volume_change_pct_vs_7d_avg": 0.05,
        "cpu_utilization_pct": 35,
        "memory_utilization_pct": 45,
        "concurrent_pipelines": 1,
        "is_weekend": 0,
    }


def test_prediction_rejects_invalid_feature_value(client):
    payload = valid_payload()
    payload["hour_of_day"] = 25

    response = client.post(
        "/predictions/failure/bronze_customers",
        json=payload,
    )

    assert response.status_code == 422


def test_prediction_rejects_unsupported_dataset(client):
    response = client.post(
        "/predictions/failure/unknown_dataset",
        json=valid_payload(),
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported dataset name."


def test_prediction_returns_503_when_model_artifacts_are_missing(
    client, monkeypatch
):
    def missing_artifacts(**kwargs):
        raise FileNotFoundError("Prediction artifacts unavailable")

    monkeypatch.setattr(
        prediction_routes,
        "predict_failure",
        missing_artifacts,
    )

    response = client.post(
        "/predictions/failure/bronze_customers",
        json=valid_payload(),
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Prediction artifacts unavailable"
    )

def test_prediction_returns_sanitized_500_on_unexpected_error(
    client, monkeypatch
):
    def inference_failure(**kwargs):
        raise RuntimeError("Internal database connection details")

    monkeypatch.setattr(
        prediction_routes,
        "predict_failure",
        inference_failure,
    )

    response = client.post(
        "/predictions/failure/bronze_customers",
        json=valid_payload(),
    )

    assert response.status_code == 500
    assert response.json()["detail"] == (
        "Failure prediction failed. Check application logs."
    )
    assert "Internal database connection details" not in response.text


def test_prediction_returns_valid_response(client, monkeypatch):
    expected = {
        "dataset_name": "bronze_customers",
        "failure_probability": 0.12,
        "risk_level": "LOW",
        "predicted_failure": False,
        "decision_threshold": 0.35,
        "model_version": "random-forest-v1",
        "prediction_id": 55,
        "pipeline_run_id": None,
        "predicted_at": "2026-10-22T10:00:00",
    }

    def fake_prediction(**kwargs):
        return expected

    monkeypatch.setattr(
        prediction_routes,
        "predict_failure",
        fake_prediction,
    )

    response = client.post(
        "/predictions/failure/bronze_customers",
        json=valid_payload(),
    )

    assert response.status_code == 200
    body = response.json()

    assert body["dataset_name"] == "bronze_customers"
    assert body["failure_probability"] == 0.12
    assert body["risk_level"] == "LOW"
    assert body["predicted_failure"] is False
    assert body["prediction_id"] == 55
    assert body["pipeline_run_id"] is None
    assert body["model_version"] == "random-forest-v1"

