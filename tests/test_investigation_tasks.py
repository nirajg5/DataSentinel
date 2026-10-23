
import json
from unittest.mock import MagicMock

import pytest

from backend.tasks import investigation_tasks as tasks


@pytest.fixture
def task_context(monkeypatch):
    task_id = "test-task-123"
    db = MagicMock()

    query = db.query.return_value
    query.filter.return_value = query
    query.update.return_value = 1

    session = MagicMock()
    session.__enter__.return_value = db
    session.__exit__.return_value = False

    monkeypatch.setattr(
        tasks,
        "SessionLocal",
        lambda: session,
    )

    task = tasks.run_investigation_task

    return task_id, db, query, task


def run_task(task, task_id, question, user_id, retries=0):
    """Run the bound Celery task with a controlled request context."""
    task.push_request(
        id=task_id,
        retries=retries,
    )
    try:
        return task.run(question, user_id)
    finally:
        task.pop_request()


def test_successful_task_claims_and_completes_job(
    task_context, monkeypatch
):
    task_id, db, query, task = task_context
    expected = {
        "question": "Check freshness",
        "answer": "Freshness is valid.",
    }

    monkeypatch.setattr(
        "backend.agents.graph.investigate",
        lambda question: expected,
    )

    result = run_task(
        task, task_id, "Check freshness", 7
    )

    assert result == expected
    assert db.commit.call_count == 2
    assert query.update.call_count == 2

    first_update = query.update.call_args_list[0].args[0]
    second_update = query.update.call_args_list[1].args[0]

    assert first_update[tasks.InvestigationJob.status] == "STARTED"
    assert second_update[tasks.InvestigationJob.status] == "SUCCESS"
    assert json.loads(
        second_update[tasks.InvestigationJob.result_json]
    ) == expected
    assert second_update[tasks.InvestigationJob.completed_at] is not None


def test_task_ignores_job_that_cannot_be_claimed(
    task_context, monkeypatch
):
    task_id, db, query, task = task_context
    query.update.return_value = 0

    investigate = MagicMock()
    monkeypatch.setattr(
        "backend.agents.graph.investigate",
        investigate,
    )

    result = run_task(
        task, task_id, "Check freshness", 7
    )

    assert result == {
        "status": "IGNORED",
        "task_id": task_id,
    }
    investigate.assert_not_called()
    assert db.commit.call_count == 1


def test_task_discards_result_if_job_status_changed(
    task_context, monkeypatch
):
    task_id, db, query, task = task_context
    query.update.side_effect = [1, 0]

    monkeypatch.setattr(
        "backend.agents.graph.investigate",
        lambda question: {"answer": "Late result"},
    )

    result = run_task(
        task, task_id, "Check freshness", 7
    )

    assert result == {
        "status": "STALE_RESULT_DISCARDED",
        "task_id": task_id,
    }
    assert db.commit.call_count == 2


def test_task_retries_transient_failure(
    task_context, monkeypatch
):
    task_id, db, query, task = task_context

    monkeypatch.setattr(
        "backend.agents.graph.investigate",
        MagicMock(side_effect=RuntimeError("temporary failure")),
    )

    retry = MagicMock(
        side_effect=RuntimeError("retry scheduled")
    )
    monkeypatch.setattr(task, "retry", retry)

    with pytest.raises(RuntimeError, match="retry scheduled"):
        run_task(
            task,
            task_id,
            "Check freshness",
            7,
            retries=0,
        )

    retry.assert_called_once()
    assert db.commit.call_count == 2

    failure_update = query.update.call_args_list[1].args[0]
    assert failure_update[tasks.InvestigationJob.status] == "PENDING"
    assert failure_update[tasks.InvestigationJob.started_at] is None


def test_task_marks_final_failure_after_retries(
    task_context, monkeypatch
):
    task_id, db, query, task = task_context

    monkeypatch.setattr(
        "backend.agents.graph.investigate",
        MagicMock(side_effect=RuntimeError("persistent failure")),
    )

    with pytest.raises(RuntimeError, match="persistent failure"):
        run_task(
            task,
            task_id,
            "Check freshness",
            7,
            retries=2,
        )

    failure_update = query.update.call_args_list[1].args[0]

    assert failure_update[tasks.InvestigationJob.status] == "FAILURE"
    assert failure_update[tasks.InvestigationJob.completed_at] is not None
    assert "failed after retries" in (
        failure_update[tasks.InvestigationJob.error_message]
    )
    assert db.commit.call_count == 2
