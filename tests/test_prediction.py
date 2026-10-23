from datetime import datetime

import pytest
import numpy as np
from pydantic import ValidationError

from backend.prediction.schemas import FailurePredictionRequest
from backend.prediction import service


def valid_payload():
    return {
        "pipeline_name": "bronze_customers",
        "hour_of_day": 14,
        "day_of_week": 2,
        "expected_rows": 10000,
        "source_freshness_lag_minutes": 5.0,
        "upstream_failures_24h": 0,
        "failures_last_10_runs": 0,
        "success_streak_before_run": 10,
        "schema_change_detected": 0,
        "null_rate_last_run": 0.01,
        "duplicate_rate_last_run": 0.005,
        "volume_change_pct_vs_7d_avg": 2.0,
        "cpu_utilization_pct": 35.0,
        "memory_utilization_pct": 40.0,
        "concurrent_pipelines": 2,
        "is_weekend": 0,
    }


class FakeModel:
    def __init__(self, probability):
        self.probability = probability
        self.received_frame = None

    def predict_proba(self, frame):
        self.received_frame = frame
        return np.array([[1 - self.probability, self.probability]])


class FakeDB:
    def __init__(self):
        self.records = []
        self.committed = False
        self.rolled_back = False

    def add(self, record):
        self.records.append(record)

    def commit(self):
        self.committed = True

    def refresh(self, record):
        record.id = 123
        if not getattr(record, "predicted_at", None):
            record.predicted_at = datetime(2026, 1, 1)


def test_request_schema_accepts_valid_payload():
    request = FailurePredictionRequest(**valid_payload())
    assert request.pipeline_name == "bronze_customers"
    assert request.schema_change_detected == 0


def test_request_schema_rejects_invalid_hour():
    payload = valid_payload()
    payload["hour_of_day"] = 24

    with pytest.raises(ValidationError):
        FailurePredictionRequest(**payload)


@pytest.mark.parametrize(
    ("probability", "expected_risk", "expected_failure"),
    [
        (0.20, "LOW", False),
        (0.50, "MEDIUM", True),
        (0.80, "HIGH", True),
    ],
)
def test_prediction_and_database_persistence(
    monkeypatch, probability, expected_risk, expected_failure
):
    features = {"hour_of_day": 14}
    model = FakeModel(probability)
    metadata = {
        "features": ["hour_of_day"],
        "decision_threshold": 0.35,
    }
    db = FakeDB()

    monkeypatch.setattr(
        service,
        "load_model_artifacts",
        lambda: (model, metadata),
    )

    result = service.predict_failure(
        dataset_name="bronze_customers",
        features=features,
        db=db,
    )

    assert result["failure_probability"] == probability
    assert result["risk_level"] == expected_risk
    assert result["predicted_failure"] is expected_failure
    assert result["prediction_id"] == 123
    assert db.committed is True
    assert len(db.records) == 1
    assert db.records[0].dataset_name == "bronze_customers"


def test_prediction_rolls_back_if_database_commit_fails(monkeypatch):
    class FailingDB(FakeDB):
        def commit(self):
            raise RuntimeError("Database unavailable")

        def rollback(self):
            self.rolled_back = True

    monkeypatch.setattr(
        service,
        "load_model_artifacts",
        lambda: (
            FakeModel(0.20),
            {"features": ["hour_of_day"], "decision_threshold": 0.35},
        ),
    )

    db = FailingDB()

    with pytest.raises(RuntimeError, match="Database unavailable"):
        service.predict_failure(
            dataset_name="bronze_customers",
            features={"hour_of_day": 14},
            db=db,
        )

    assert db.rolled_back is True


