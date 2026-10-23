
from datetime import datetime, timedelta
from unittest.mock import MagicMock

import pytest

import backend.freshness.service as service


class FakeConnection:
    def __init__(self, latest_run):
        self.latest_run = latest_run
        self.execute_calls = []

    def execute(self, statement, params=None):
        self.execute_calls.append((statement, params))
        result = MagicMock()
        result.first.return_value = self.latest_run
        return result

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class FakeEngine:
    def __init__(self, latest_run):
        self.connection = FakeConnection(latest_run)

    def connect(self):
        return self.connection

    def begin(self):
        return self.connection


def setup_freshness_mocks(monkeypatch, latest_run):
    fake_engine = FakeEngine(latest_run)

    inspector = MagicMock()
    inspector.has_table.return_value = True

    monkeypatch.setattr(service, "engine", fake_engine)
    monkeypatch.setattr(
        service,
        "inspect",
        lambda engine: inspector,
    )

    fixed_now = datetime(2026, 10, 22, 12, 0, 0)

    class FixedDateTime(datetime):
        @classmethod
        def now(cls, tz=None):
            return fixed_now

    monkeypatch.setattr(service, "datetime", FixedDateTime)

    return fake_engine


def test_stale_dataset_exceeds_configured_sla(monkeypatch):
    now = datetime(2026, 10, 22, 12, 0, 0)
    completed_at = now - timedelta(hours=25)

    fake_engine = setup_freshness_mocks(
        monkeypatch,
        latest_run=(completed_at,),
    )

    result = service.check_dataset_freshness("bronze_customers")

    assert result["freshness_status"] == "STALE"
    assert result["sla_hours"] == 24
    assert result["age_hours"] == 25.0
    assert result["freshness_score"] == 0.0

    insert_call = fake_engine.connection.execute_calls[-1]
    assert "INSERT INTO dataset_freshness" in str(insert_call[0])


def test_dataset_never_updated(monkeypatch):
    fake_engine = setup_freshness_mocks(
        monkeypatch,
        latest_run=None,
    )

    result = service.check_dataset_freshness("bronze_customers")

    assert result["freshness_status"] == "NEVER_UPDATED"
    assert result["actual_update_time"] is None
    assert result["expected_update_time"] is None
    assert result["age_hours"] is None
    assert result["freshness_score"] == 0.0

    insert_call = fake_engine.connection.execute_calls[-1]
    assert "INSERT INTO dataset_freshness" in str(insert_call[0])


def test_unsupported_dataset_is_rejected():
    with pytest.raises(ValueError, match="Unsupported dataset"):
        service.check_dataset_freshness("unknown_dataset")



@pytest.mark.parametrize(
    ("age_hours", "expected_status", "expected_score"),
    [
        (23.99, "FRESH", 0.04),
        (24.0, "FRESH", 0.0),
        (24.01, "STALE", 0.0),
    ],
)
def test_freshness_status_at_sla_boundary(
    monkeypatch,
    age_hours,
    expected_status,
    expected_score,
):
    now = datetime(2026, 10, 22, 12, 0, 0)
    completed_at = now - timedelta(hours=age_hours)

    setup_freshness_mocks(
        monkeypatch,
        latest_run=(completed_at,),
    )

    result = service.check_dataset_freshness("bronze_customers")

    assert result["freshness_status"] == expected_status
    assert result["freshness_score"] == expected_score
