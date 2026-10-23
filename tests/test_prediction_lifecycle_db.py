
import numpy as np
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.models
import backend.prediction.service as prediction_service

from backend.models.base import Base
from backend.models.failure_prediction import FailurePrediction
from backend.models.pipeline_run import PipelineRun
from backend.prediction.evaluation import evaluate_predictions


FEATURES = {
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


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def create_run(db, status="STARTED", dataset_name="bronze_customers"):
    run = PipelineRun(
        pipeline_name="bronze_csv_ingestion",
        dataset_name=dataset_name,
        run_id=f"lifecycle-{status}-{dataset_name}",
        status=status,
        rows_read=200,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def install_mock_model(monkeypatch, probability=0.8):
    class MockModel:
        def predict_proba(self, dataframe):
            assert list(dataframe.columns) == list(FEATURES)
            return np.array([[1 - probability, probability]])

    metadata = {
        "features": list(FEATURES),
        "decision_threshold": 0.35,
    }

    monkeypatch.setattr(
        prediction_service,
        "load_model_artifacts",
        lambda: (MockModel(), metadata),
    )


@pytest.mark.parametrize(
    ("final_status", "probability", "expected_metric"),
    [
        ("FAILED", 0.8, "true_positive"),
        ("SUCCESS", 0.1, "true_negative"),
    ],
)
def test_prediction_is_persisted_and_evaluated(
    db, monkeypatch, final_status, probability, expected_metric
):
    install_mock_model(monkeypatch, probability)
    run = create_run(db)

    result = prediction_service.predict_failure(
        dataset_name=run.dataset_name,
        features=FEATURES,
        db=db,
        pipeline_run_id=run.id,
    )

    assert result["prediction_id"] is not None
    assert result["pipeline_run_id"] == run.id
    assert result["predicted_failure"] == (probability >= 0.35)

    saved = db.get(FailurePrediction, result["prediction_id"])
    assert saved is not None
    assert saved.pipeline_run_id == run.id

    # Evaluation considers only completed runs.
    run.status = final_status
    db.commit()

    evaluation = evaluate_predictions(db)

    assert evaluation["total_predictions"] == 1
    assert evaluation["evaluated_predictions"] == 1
    assert evaluation["excluded_predictions"] == 0
    assert evaluation["confusion_matrix"][expected_metric] == 1


@pytest.mark.parametrize(
    ("run_status", "run_dataset", "run_pipeline", "expected_message"),
    [
        (
            "SUCCESS",
            "bronze_customers",
            "bronze_csv_ingestion",
            "whose status is STARTED",
        ),
        (
            "STARTED",
            "bronze_orders",
            "bronze_csv_ingestion",
            "does not match the prediction dataset",
        ),
        (
            "STARTED",
            "bronze_customers",
            "another_pipeline",
            "does not match the prediction request",
        ),
    ],
)
def test_invalid_run_linkage_is_rejected(
    db,
    monkeypatch,
    run_status,
    run_dataset,
    run_pipeline,
    expected_message,
):
    install_mock_model(monkeypatch)
    run = create_run(db, status=run_status, dataset_name=run_dataset)

    # Override the run's pipeline name when testing a mismatch.
    run.pipeline_name = run_pipeline
    db.commit()

    with pytest.raises(ValueError, match=expected_message):
        prediction_service.predict_failure(
            dataset_name="bronze_customers",
            features=FEATURES,
            db=db,
            pipeline_run_id=run.id,
        )

    assert db.query(FailurePrediction).count() == 0


def test_missing_pipeline_run_is_rejected(db, monkeypatch):
    install_mock_model(monkeypatch)

    with pytest.raises(ValueError, match="does not exist"):
        prediction_service.predict_failure(
            dataset_name="bronze_customers",
            features=FEATURES,
            db=db,
            pipeline_run_id=99999,
        )

    assert db.query(FailurePrediction).count() == 0


def test_prediction_commit_failure_rolls_back_session(db, monkeypatch):
    install_mock_model(monkeypatch)
    run = create_run(db)

    original_commit = db.commit
    original_rollback = db.rollback

    rollback_called = False

    def failing_commit():
        raise RuntimeError("Simulated database commit failure")

    def tracked_rollback():
        nonlocal rollback_called
        rollback_called = True
        original_rollback()

    monkeypatch.setattr(db, "commit", failing_commit)
    monkeypatch.setattr(db, "rollback", tracked_rollback)

    with pytest.raises(
        RuntimeError,
        match="Simulated database commit failure",
    ):
        prediction_service.predict_failure(
            dataset_name=run.dataset_name,
            features=FEATURES,
            db=db,
            pipeline_run_id=run.id,
        )

    assert rollback_called is True

    # Restore commit so the session can be queried safely.
    monkeypatch.setattr(db, "commit", original_commit)

    assert db.query(FailurePrediction).count() == 0

