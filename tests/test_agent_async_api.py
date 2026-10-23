
from datetime import datetime, timezone
from unittest.mock import MagicMock, Mock
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth.constants import ADMIN
from backend.auth.dependencies import get_current_user
from backend.agents import routes as agent_routes


class FakeUser:
    def __init__(self, user_id=7, role=ADMIN):
        self.id = user_id
        self.role = role


class FakeJob:
    def __init__(
        self,
        task_id="test-task-123",
        user_id=7,
        status="PENDING",
    ):
        self.id = 1
        self.task_id = task_id
        self.user_id = user_id
        self.question = "Check bronze_customers freshness"
        self.status = status
        self.result_json = None
        self.error_message = None
        self.created_at = datetime.now(timezone.utc)
        self.started_at = None
        self.completed_at = None


@pytest.fixture
def client():
    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = lambda: FakeUser()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def fake_db(monkeypatch):
    db = MagicMock()
    session = MagicMock()
    session.__enter__.return_value = db
    session.__exit__.return_value = False

    monkeypatch.setattr(
        agent_routes,
        "SessionLocal",
        lambda: session,
    )

    return db, session


def test_async_submission_returns_202(client, fake_db, monkeypatch):
    db, session = fake_db

    queued_task = Mock()
    monkeypatch.setattr(
        agent_routes,
        "run_investigation_task",
        SimpleNamespace(apply_async=queued_task.apply_async),
    )

    response = client.post(
        "/agent/investigate/async",
        json={"question": "Check bronze_customers freshness"},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["message"] == "Investigation submitted successfully"
    assert body["status"] == "PENDING"
    assert body["task_id"]

    db.add.assert_called_once()
    db.commit.assert_called_once()

    saved_job = db.add.call_args.args[0]
    assert saved_job.task_id == body["task_id"]
    assert saved_job.user_id == 7
    assert saved_job.status == "PENDING"

    queued_task.apply_async.assert_called_once_with(
        args=["Check bronze_customers freshness", 7],
        task_id=body["task_id"],
    )


def test_async_submission_rejects_short_question(client, fake_db):
    db, session = fake_db

    response = client.post(
        "/agent/investigate/async",
        json={"question": "abc"},
    )

    assert response.status_code == 422
    db.add.assert_not_called()


def test_async_submission_returns_503_when_queue_fails(
    client, fake_db, monkeypatch
):
    db, session = fake_db
    query = db.query.return_value
    query.filter.return_value = query
    query.first.return_value = FakeJob()

    monkeypatch.setattr(
        agent_routes,
        "run_investigation_task",
        SimpleNamespace(
            apply_async=Mock(
                side_effect=RuntimeError("Redis connection details")
            )
        ),
    )

    response = client.post(
        "/agent/investigate/async",
        json={"question": "Check bronze_customers freshness"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == (
        "Investigation could not be queued."
    )
    assert "Redis connection details" not in response.text
    assert db.commit.call_count == 2


def test_task_status_returns_404_for_missing_job(
    client, fake_db
):
    db, session = fake_db
    query = db.query.return_value
    query.filter.return_value = query
    query.first.return_value = None

    response = client.get("/agent/tasks/missing-task")

    assert response.status_code == 404
    assert response.json()["detail"] == "Investigation job not found."


def test_task_status_forbids_access_to_another_users_job(
    client, fake_db
):
    db, session = fake_db
    query = db.query.return_value
    query.filter.return_value = query
    query.first.return_value = FakeJob(user_id=99)

    response = client.get("/agent/tasks/test-task-123")

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "You cannot access this investigation."
    )


def test_task_status_returns_success_result(client, fake_db):
    db, session = fake_db
    job = FakeJob(status="SUCCESS")
    job.result_json = '{"answer": "Freshness is valid."}'

    query = db.query.return_value
    query.filter.return_value = query
    query.first.return_value = job

    response = client.get("/agent/tasks/test-task-123")

    assert response.status_code == 200
    body = response.json()
    assert body["task_id"] == "test-task-123"
    assert body["status"] == "SUCCESS"
    assert body["result"] == {"answer": "Freshness is valid."}


def test_history_returns_paginated_results(client, fake_db):
    db, session = fake_db
    job = FakeJob(status="FAILURE")
    job.error_message = "Investigation failed."

    query = db.query.return_value
    query.filter.return_value = query
    query.count.return_value = 1
    query.order_by.return_value = query
    query.offset.return_value = query
    query.limit.return_value = query
    query.all.return_value = [job]

    response = client.get(
        "/agent/history?limit=5&offset=0&status=failure"
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["limit"] == 5
    assert body["offset"] == 0
    assert body["filters"]["status"] == "FAILURE"
    assert len(body["items"]) == 1
    assert body["items"][0]["status"] == "FAILURE"
    assert body["items"][0]["error"] == "Investigation failed."


def test_history_rejects_invalid_status(client, fake_db):
    db, session = fake_db

    response = client.get("/agent/history?status=UNKNOWN")

    assert response.status_code == 400
    assert response.json()["detail"].startswith("Invalid status.")


def test_stale_recovery_is_forbidden_for_data_engineer(
    monkeypatch,
):
    app.dependency_overrides.clear()
    app.dependency_overrides[get_current_user] = (
        lambda: FakeUser(user_id=7, role="DATA_ENGINEER")
    )

    try:
        with TestClient(app) as test_client:
            response = test_client.post(
                "/agent/maintenance/recover-stale"
            )

        assert response.status_code == 403
        assert response.json()["detail"] == "Insufficient permissions"
    finally:
        app.dependency_overrides.clear()
