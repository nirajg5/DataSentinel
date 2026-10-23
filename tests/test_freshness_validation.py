
from backend.agents.freshness_validation import (
    validate_freshness_evidence,
)


def test_valid_freshness_evidence():
    timestamp = "2026-10-22T05:58:18.213834"

    result = validate_freshness_evidence(
        "bronze_customers",
        {
            "runs": [{
                "run_id": "run-13",
                "status": "SUCCESS",
                "completed_at": timestamp,
            }]
        },
        {
            "freshness": {
                "actual_update_time": timestamp,
                "checked_at": timestamp,
                "freshness_status": "FRESH",
                "freshness_score": 100.0,
            }
        },
    )

    assert result["valid"] is True
    assert result["issues"] == []


def test_detects_mismatched_update_time():
    result = validate_freshness_evidence(
        "bronze_customers",
        {
            "runs": [{
                "run_id": "run-13",
                "status": "SUCCESS",
                "completed_at": "2026-10-22T05:58:18",
            }]
        },
        {
            "freshness": {
                "actual_update_time": "2026-10-21T19:02:38",
                "checked_at": "2026-10-22T05:58:18",
                "freshness_status": "FRESH",
                "freshness_score": 55.0,
            }
        },
    )

    assert result["valid"] is False
    assert any("actual_update_time" in issue for issue in result["issues"])


def test_detects_incorrect_score():
    timestamp = "2026-10-22T05:58:18"

    result = validate_freshness_evidence(
        "bronze_customers",
        {
            "runs": [{
                "run_id": "run-13",
                "status": "SUCCESS",
                "completed_at": timestamp,
            }]
        },
        {
            "freshness": {
                "actual_update_time": timestamp,
                "checked_at": "2026-10-22T11:58:18",
                "freshness_status": "FRESH",
                "freshness_score": 100.0,
            }
        },
    )

    assert result["valid"] is False
    assert any("score" in issue.lower() for issue in result["issues"])


def test_detects_missing_freshness_assessment():
    result = validate_freshness_evidence(
        "bronze_customers",
        {"runs": [{
            "status": "SUCCESS",
            "completed_at": "2026-10-22T05:58:18",
        }]},
        {"freshness": None},
    )

    assert result["valid"] is False
    assert any("No freshness assessment" in issue for issue in result["issues"])


def test_validation_returns_configured_sla():
    from backend.agents.freshness_validation import (
        validate_freshness_evidence,
    )

    from backend.freshness.service import SLA_HOURS

    dataset_name = "bronze_customers"
    run_time = "2026-10-22T05:58:18.213834"
    checked_at = "2026-10-22T06:25:39.908647"

    result = validate_freshness_evidence(
        dataset_name=dataset_name,
        pipeline_history={
            "runs": [
                {
                    "run_id": "test-run-1",
                    "status": "SUCCESS",
                    "completed_at": run_time,
                }
            ]
        },
        freshness_data={
            "freshness": {
                "actual_update_time": run_time,
                "checked_at": checked_at,
                "freshness_score": 98.1,
                "freshness_status": "FRESH",
            }
        },
    )

    assert result["valid"] is True
    assert result["sla_hours"] == SLA_HOURS[dataset_name]
    assert result["issues"] == []


def test_validation_rejects_incorrect_freshness_status():
    from backend.agents.freshness_validation import (
        validate_freshness_evidence,
    )

    run_time = "2026-10-22T05:58:18.213834"
    checked_at = "2026-10-22T06:25:39.908647"

    result = validate_freshness_evidence(
        dataset_name="bronze_customers",
        pipeline_history={
            "runs": [
                {
                    "run_id": "test-run-2",
                    "status": "SUCCESS",
                    "completed_at": run_time,
                }
            ]
        },
        freshness_data={
            "freshness": {
                "actual_update_time": run_time,
                "checked_at": checked_at,
                "freshness_score": 98.1,
                "freshness_status": "STALE",
            }
        },
    )

    assert result["valid"] is False
    assert any(
        "status should be FRESH" in issue
        for issue in result["issues"]
    )


def test_validation_rejects_missing_check_timestamp():
    from backend.agents.freshness_validation import (
        validate_freshness_evidence,
    )

    run_time = "2026-10-22T05:58:18.213834"

    result = validate_freshness_evidence(
        dataset_name="bronze_customers",
        pipeline_history={
            "runs": [
                {
                    "run_id": "test-run-3",
                    "status": "SUCCESS",
                    "completed_at": run_time,
                }
            ]
        },
        freshness_data={
            "freshness": {
                "actual_update_time": run_time,
                "freshness_score": 100,
                "freshness_status": "FRESH",
            }
        },
    )

    assert result["valid"] is False
    assert any(
        "timestamp is missing" in issue
        for issue in result["issues"]
    )


def test_detects_missing_actual_update_time():
    result = validate_freshness_evidence(
        dataset_name="bronze_customers",
        pipeline_history={
            "runs": [
                {
                    "run_id": "run-101",
                    "status": "SUCCESS",
                    "completed_at": "2026-10-22T05:58:18.213834",
                }
            ]
        },
        freshness_data={
            "freshness": {
                "actual_update_time": None,
                "checked_at": "2026-10-22T06:00:00",
                "freshness_score": 100.0,
                "freshness_status": "FRESH",
            }
        },
    )

    assert result["valid"] is False
    assert any(
        "actual_update_time is missing" in issue
        for issue in result["issues"]
    )


def test_rejects_freshness_score_outside_range():
    result = validate_freshness_evidence(
        dataset_name="bronze_customers",
        pipeline_history={
            "runs": [
                {
                    "run_id": "run-102",
                    "status": "SUCCESS",
                    "completed_at": "2026-10-22T05:58:18.213834",
                }
            ]
        },
        freshness_data={
            "freshness": {
                "actual_update_time": "2026-10-22T05:58:18.213834",
                "checked_at": "2026-10-22T06:00:00",
                "freshness_score": 150,
                "freshness_status": "FRESH",
            }
        },
    )

    assert result["valid"] is False
    assert any(
        "between 0 and 100" in issue
        for issue in result["issues"]
    )


def test_detects_invalid_freshness_timestamp():
    result = validate_freshness_evidence(
        dataset_name="bronze_customers",
        pipeline_history={
            "runs": [
                {
                    "run_id": "run-103",
                    "status": "SUCCESS",
                    "completed_at": "2026-10-22T05:58:18.213834",
                }
            ]
        },
        freshness_data={
            "freshness": {
                "actual_update_time": "not-a-timestamp",
                "checked_at": "2026-10-22T06:00:00",
                "freshness_score": 100.0,
                "freshness_status": "FRESH",
            }
        },
    )

    assert result["valid"] is False
    assert any(
        "invalid timestamp" in issue
        for issue in result["issues"]
    )

