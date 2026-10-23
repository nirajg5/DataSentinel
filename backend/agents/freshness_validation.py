
from datetime import datetime

from backend.freshness.service import SLA_HOURS


def _parse_datetime(value):
    """Parse an ISO datetime string or return an existing datetime."""
    if isinstance(value, datetime):
        return value

    if isinstance(value, str) and value.strip():
        return datetime.fromisoformat(value)

    return None


def validate_freshness_evidence(
    dataset_name: str,
    pipeline_history: dict,
    freshness_data: dict,
) -> dict:
    """Validate freshness evidence against pipeline history and SLA."""
    if not isinstance(dataset_name, str):
        return {
            "valid": False,
            "issues": ["Dataset name must be a string."],
        }

    dataset_name = dataset_name.strip().lower()

    if dataset_name not in SLA_HOURS:
        return {
            "valid": False,
            "issues": ["Unsupported dataset."],
        }

    runs = pipeline_history.get("runs", [])
    if not isinstance(runs, list):
        return {
            "valid": False,
            "issues": ["Pipeline runs must be provided as a list."],
        }

    successful_runs = []

    try:
        for run in runs:
            if (
                run.get("status") == "SUCCESS"
                and run.get("completed_at") is not None
            ):
                completed_at = _parse_datetime(run["completed_at"])

                if completed_at is not None:
                    successful_runs.append((run, completed_at))
    except (AttributeError, TypeError, ValueError):
        return {
            "valid": False,
            "issues": ["Pipeline history contains invalid run data."],
        }

    if not successful_runs:
        return {
            "valid": False,
            "issues": [
                "No successful pipeline completion is available."
            ],
        }

    latest_run, run_time = max(
        successful_runs,
        key=lambda item: item[1],
    )

    freshness = freshness_data.get("freshness")
    if not isinstance(freshness, dict) or not freshness:
        return {
            "valid": False,
            "issues": ["No freshness assessment is available."],
        }

    issues = []

    try:
        update_time = _parse_datetime(
            freshness.get("actual_update_time")
        )
        checked_at = _parse_datetime(freshness.get("checked_at"))
    except (TypeError, ValueError, OverflowError):
        return {
            "valid": False,
            "dataset_name": dataset_name,
            "sla_hours": SLA_HOURS[dataset_name],
            "latest_successful_run_id": latest_run.get("run_id"),
            "issues": ["Freshness evidence contains an invalid timestamp."],
        }

    if update_time is None:
        issues.append("Freshness actual_update_time is missing.")
    elif update_time != run_time:
        issues.append(
            "Freshness actual_update_time does not match "
            "the latest successful pipeline completion."
        )

    if checked_at is None:
        issues.append("Freshness assessment timestamp is missing.")

    if update_time is not None and checked_at is not None:
        try:
            if checked_at < run_time:
                issues.append(
                    "Freshness assessment predates the latest successful run."
                )

            if checked_at < update_time:
                issues.append(
                    "Freshness assessment predates the actual update time."
                )

            age_hours = max(
                0.0,
                (checked_at - update_time).total_seconds() / 3600,
            )

            sla_hours = SLA_HOURS[dataset_name]

            expected_score = round(
                max(
                    0.0,
                    min(100.0, 100 * (1 - age_hours / sla_hours)),
                ),
                2,
            )

            actual_score = freshness.get("freshness_score")

            try:
                score = float(actual_score)
                if not 0 <= score <= 100:
                    raise ValueError
            except (TypeError, ValueError):
                issues.append(
                    "Freshness score must be a number between 0 and 100."
                )
            else:
                if abs(score - expected_score) > 0.02:
                    issues.append(
                        "Freshness score does not match the SLA calculation; "
                        f"expected approximately {expected_score}."
                    )

            expected_status = (
                "FRESH" if age_hours <= sla_hours else "STALE"
            )

            if freshness.get("freshness_status") != expected_status:
                issues.append(
                    f"Freshness status should be {expected_status} "
                    "based on the configured SLA."
                )

        except TypeError:
            issues.append(
                "Freshness timestamps must use compatible timezone formats."
            )

    return {
        "valid": not issues,
        "dataset_name": dataset_name,
        "sla_hours": SLA_HOURS[dataset_name],
        "latest_successful_run_id": latest_run.get("run_id"),
        "issues": issues,
    }
