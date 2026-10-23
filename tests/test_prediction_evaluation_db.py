
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.models  # Register model classes with Base.metadata
from backend.models.base import Base
from backend.models.failure_prediction import FailurePrediction
from backend.models.pipeline_run import PipelineRun
from backend.prediction.evaluation import evaluate_predictions


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
    TestingSession = sessionmaker(bind=engine)

    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def add_run(db, run_id, status):
    run = PipelineRun(
        pipeline_name="bronze_csv_ingestion",
        dataset_name="bronze_customers",
        run_id=run_id,
        status=status,
        rows_read=100,
        rows_processed=100 if status == "SUCCESS" else 0,
        rows_loaded=100 if status == "SUCCESS" else 0,
    )
    db.add(run)
    db.flush()
    return run


def add_prediction(db, run, predicted_failure):
    prediction = FailurePrediction(
        dataset_name="bronze_customers",
        pipeline_run_id=run.id if run else None,
        failure_probability=0.8 if predicted_failure else 0.1,
        risk_level="HIGH" if predicted_failure else "LOW",
        predicted_failure=predicted_failure,
    )
    db.add(prediction)
    db.flush()
    return prediction


def test_evaluation_calculates_confusion_matrix_from_database(db):
    failed_run = add_run(db, "failed-1", "FAILED")
    success_run = add_run(db, "success-1", "SUCCESS")
    false_negative_run = add_run(db, "failed-2", "FAILED")
    false_positive_run = add_run(db, "success-2", "SUCCESS")

    add_prediction(db, failed_run, True)             # TP
    add_prediction(db, success_run, False)            # TN
    add_prediction(db, false_negative_run, False)     # FN
    add_prediction(db, false_positive_run, True)      # FP

    db.commit()

    result = evaluate_predictions(db)

    assert result["total_predictions"] == 4
    assert result["evaluated_predictions"] == 4
    assert result["excluded_predictions"] == 0

    assert result["confusion_matrix"] == {
        "true_positive": 1,
        "false_positive": 1,
        "true_negative": 1,
        "false_negative": 1,
    }

    assert result["metrics"]["precision"] == 0.5
    assert result["metrics"]["recall"] == 0.5
    assert result["metrics"]["f1_score"] == 0.5
    assert result["metrics"]["false_positive_rate"] == 0.5


def test_evaluation_excludes_unlinked_and_started_runs(db):
    started_run = add_run(db, "started-1", "STARTED")
    completed_run = add_run(db, "success-2", "SUCCESS")

    add_prediction(db, started_run, True)
    add_prediction(db, completed_run, False)
    add_prediction(db, None, True)

    db.commit()

    result = evaluate_predictions(db)

    assert result["total_predictions"] == 3
    assert result["evaluated_predictions"] == 1
    assert result["excluded_predictions"] == 2
    assert result["confusion_matrix"]["true_negative"] == 1


def test_evaluation_handles_no_eligible_predictions(db):
    started_run = add_run(db, "started-2", "STARTED")
    add_prediction(db, started_run, True)
    add_prediction(db, None, False)

    db.commit()

    result = evaluate_predictions(db)

    assert result["evaluated_predictions"] == 0
    assert result["excluded_predictions"] == 2
    assert result["metrics"]["precision"] is None
    assert result["metrics"]["recall"] is None
    assert result["metrics"]["f1_score"] is None
    assert result["metrics"]["false_positive_rate"] is None
