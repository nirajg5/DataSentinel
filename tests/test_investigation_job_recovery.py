
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from backend.agents import job_recovery


def make_job(status="STARTED", started_at=None):
    return MagicMock(
        status=status,
        started_at=started_at,
        completed_at=None,
        error_message=None,
    )


def setup_fake_db(monkeypatch, jobs):
    db = MagicMock()
    query = db.query.return_value
    query.filter.return_value = query
    query.all.return_value = jobs

    session_context = MagicMock()
    session_context.__enter__.return_value = db
    session_context.__exit__.return_value = False

    monkeypatch.setattr(
        job_recovery,
        "SessionLocal",
        lambda: session_context,
    )

    return db, query


def test_recovery_marks_stale_jobs_as_failed(monkeypatch):
    now = datetime.now(timezone.utc)
    stale_job = make_job(
        started_at=now - timedelta(minutes=45)
    )
    db, query = setup_fake_db(monkeypatch, [stale_job])

    result = job_recovery.recover_stale_investigations(
        timeout_minutes=30
    )

    assert stale_job.status == "FAILURE"
    assert stale_job.completed_at is not None
    assert stale_job.error_message is not None
    assert "exceeded its allowed runtime" in stale_job.error_message
    assert result["recovered_count"] == 1
    assert result["timeout_minutes"] == 30
    db.commit.assert_called_once()


def test_recovery_handles_no_stale_jobs(monkeypatch):
    db, query = setup_fake_db(monkeypatch, [])

    result = job_recovery.recover_stale_investigations()

    assert result["recovered_count"] == 0
    db.commit.assert_called_once()


@pytest.mark.parametrize("timeout_minutes", [0, -1])
def test_recovery_rejects_invalid_timeout(timeout_minutes):
    with pytest.raises(
        ValueError,
        match="timeout_minutes must be at least 1",
    ):
        job_recovery.recover_stale_investigations(
            timeout_minutes=timeout_minutes
        )


def test_recovery_returns_check_timestamp(monkeypatch):
    setup_fake_db(monkeypatch, [])

    result = job_recovery.recover_stale_investigations()

    checked_at = datetime.fromisoformat(result["checked_at"])

    assert checked_at.tzinfo is not None
    assert result["timeout_minutes"] == 30
    assert result["recovered_count"] == 0
