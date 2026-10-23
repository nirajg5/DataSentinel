
import pytest
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.models
from backend.main import app
from backend.models.base import Base
from backend.models.pipeline_run import PipelineRun
from backend.models.failure_prediction import FailurePrediction
from backend.database.dependencies import get_db
from backend.auth.dependencies import get_current_user
from backend.auth.constants import ADMIN


class FakeUser:
    role = ADMIN


@pytest.fixture
def client():
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

    app.dependency_overrides.clear()
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: FakeUser()

    try:
        with TestClient(app) as test_client:
            yield test_client, session
    finally:
        app.dependency_overrides.clear()
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()


def add_run(db, run_id, status="SUCCESS", dataset="bronze_customers"):
    run = PipelineRun(
        pipeline_name="bronze_csv_ingestion",
        dataset_name=dataset,
        run_id=run_id,
        status=status,
        source_file="customers.csv",
        rows_read=100,
        rows_processed=100,
        rows_loaded=100,
        started_at=datetime(2026, 10, 22, 9, 0),
        completed_at=(
            None if status == "STARTED"
            else datetime(2026, 10, 22, 9, 1)
        ),
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        execution_duration_seconds=(
            None if status == "STARTED" else 60
        ),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def test_list_pipeline_runs_returns_paginated_results(client):
    api, db = client
    add_run(db, "run-a")
    add_run(db, "run-b", status="FAILED")

    response = api.get("/pipeline-runs?limit=1&offset=0")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 2
    assert body["limit"] == 1
    assert len(body["items"]) == 1


def test_list_pipeline_runs_filters_by_status(client):
    api, db = client
    add_run(db, "run-success")
    add_run(db, "run-failed", status="FAILED")

    response = api.get("/pipeline-runs?status=FAILED")

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["status"] == "FAILED"


def test_list_pipeline_runs_rejects_invalid_status(client):
    api, _ = client

    response = api.get("/pipeline-runs?status=UNKNOWN")

    assert response.status_code == 400


def test_get_pipeline_run_returns_details_and_prediction(client):
    api, db = client
    run = add_run(db, "run-with-prediction")

    prediction = FailurePrediction(
        dataset_name=run.dataset_name,
        pipeline_run_id=run.id,
        failure_probability=0.8,
        risk_level="HIGH",
        predicted_failure=True,
    )
    db.add(prediction)
    db.commit()

    response = api.get(f"/pipeline-runs/{run.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == run.id
    assert body["status"] == "SUCCESS"
    assert body["prediction"]["risk_level"] == "HIGH"
    assert body["prediction"]["predicted_failure"] is True


def test_get_pipeline_run_returns_404_for_missing_id(client):
    api, _ = client

    response = api.get("/pipeline-runs/99999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Pipeline run not found."


def test_pipeline_runs_requires_authentication():
    app.dependency_overrides.clear()

    try:
        with TestClient(app) as api:
            response = api.get("/pipeline-runs")

        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_list_pipeline_runs_filters_by_dataset(client):
    api, db = client
    add_run(db, "customers-run", dataset="bronze_customers")
    add_run(db, "orders-run", dataset="bronze_orders")

    response = api.get(
        "/pipeline-runs?dataset_name=bronze_customers"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["dataset_name"] == "bronze_customers"


def test_list_pipeline_runs_rejects_invalid_limit(client):
    api, _ = client

    response = api.get("/pipeline-runs?limit=101")

    assert response.status_code == 422


def test_list_pipeline_runs_rejects_negative_offset(client):
    api, _ = client

    response = api.get("/pipeline-runs?offset=-1")

    assert response.status_code == 422


def test_get_pipeline_run_rejects_non_integer_id(client):
    api, _ = client

    response = api.get("/pipeline-runs/not-an-integer")

    assert response.status_code == 422


def test_summary_with_no_runs(client):
    api, _ = client

    response = api.get("/pipeline-runs/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_runs"] == 0
    assert data["completed_runs"] == 0
    assert data["successful_runs"] == 0
    assert data["failed_runs"] == 0
    assert data["started_runs"] == 0
    assert data["success_rate_pct"] is None
    assert data["failure_rate_pct"] is None
    assert data["recent_failures"] == []


def test_summary_with_successful_and_failed_runs(client):
    api, db = client

    add_run(db, "summary-success-1", status="SUCCESS")
    add_run(db, "summary-success-2", status="SUCCESS")
    add_run(db, "summary-failed-1", status="FAILED")
    add_run(db, "summary-started-1", status="STARTED")

    response = api.get("/pipeline-runs/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_runs"] == 4
    assert data["completed_runs"] == 3
    assert data["successful_runs"] == 2
    assert data["failed_runs"] == 1
    assert data["started_runs"] == 1
    assert data["success_rate_pct"] == 66.67
    assert data["failure_rate_pct"] == 33.33



def test_summary_includes_llm_analysis(client, monkeypatch):
    api, _ = client

    expected_analysis = {
        "explanation": "All completed runs succeeded.",
        "recommendations": [
            "Continue monitoring pipeline health."
        ],
        "model": "openai/gpt-oss-120b",
    }

    def fake_explainer(metrics):
        assert metrics["total_runs"] == 0
        return expected_analysis

    monkeypatch.setattr(
        "backend.pipeline_runs.routes.explain_pipeline_summary",
        fake_explainer,
    )

    response = api.get("/pipeline-runs/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_runs"] == 0
    assert data["llm_analysis"] == expected_analysis


def test_summary_survives_unexpected_llm_error(client, monkeypatch):
    api, _ = client

    def failing_explainer(metrics):
        raise RuntimeError("Simulated Groq failure")

    monkeypatch.setattr(
        "backend.pipeline_runs.routes.explain_pipeline_summary",
        failing_explainer,
    )

    response = api.get("/pipeline-runs/summary")

    assert response.status_code == 200
    data = response.json()
    assert data["total_runs"] == 0
    assert data["llm_analysis"] is None
    assert "success_rate_pct" in data
    assert "failure_rate_pct" in data
