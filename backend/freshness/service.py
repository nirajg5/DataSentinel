
from datetime import datetime, timedelta, timezone

from sqlalchemy import inspect, text

from backend.database.database import engine


# Expected refresh interval in hours.
# Adjust these values to match each pipeline's SLA.
SLA_HOURS = {
    "bronze_customers": 24,
    "bronze_products": 24,
    "bronze_orders": 6,
}


def check_dataset_freshness(dataset_name: str) -> dict:
    dataset_name = dataset_name.strip().lower()

    if dataset_name not in SLA_HOURS:
        raise ValueError(
            f"Unsupported dataset: {dataset_name}. "
            f"Supported datasets: {list(SLA_HOURS)}"
        )

    if not inspect(engine).has_table("pipeline_runs"):
        raise ValueError(
            "pipeline_runs table does not exist."
        )

    if not inspect(engine).has_table("dataset_freshness"):
        raise ValueError(
            "dataset_freshness table does not exist."
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    sla = timedelta(hours=SLA_HOURS[dataset_name])

    # Find the latest successful pipeline run.
    with engine.connect() as connection:
        latest_run = connection.execute(
            text("""
                SELECT completed_at
                FROM pipeline_runs
                WHERE dataset_name = :dataset_name
                  AND status = 'SUCCESS'
                  AND completed_at IS NOT NULL
                ORDER BY completed_at DESC
                LIMIT 1
            """),
            {"dataset_name": dataset_name},
        ).first()

    if latest_run is None:
        actual_update_time = None
        expected_update_time = None
        freshness_status = "NEVER_UPDATED"
        score = 0.0
        age_hours = None
    else:
        actual_update_time = latest_run[0]
        expected_update_time = actual_update_time + sla

        age = now - actual_update_time
        age_hours = round(
            max(age.total_seconds(), 0) / 3600, 2
        )

        if now <= expected_update_time:
            freshness_status = "FRESH"
        else:
            freshness_status = "STALE"

        score = round(
            max(
                0.0,
                min(100.0, 100 * (1 - age.total_seconds()
                                  / sla.total_seconds())),
            ),
            2,
        )

    # Save the latest freshness assessment.
    # Column names match the existing dataset_freshness model.

    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO dataset_freshness (
                    dataset_name,
                    expected_update_time,
                    actual_update_time,
                    freshness_status,
                    freshness_score,
                    checked_at
                )
                VALUES (
                    :dataset_name,
                    :expected_update_time,
                    :actual_update_time,
                    :freshness_status,
                    :score,
                    :checked_at
                )
            """),
            {
                "dataset_name": dataset_name,
                "expected_update_time": expected_update_time,
                "actual_update_time": actual_update_time,
                "freshness_status": freshness_status,
                "score": score,
                "checked_at": now,
            },
        )


    return {
        "dataset_name": dataset_name,
        "sla_hours": SLA_HOURS[dataset_name],
        "actual_update_time": actual_update_time,
        "expected_update_time": expected_update_time,
        "age_hours": age_hours,
        "freshness_status": freshness_status,
        "freshness_score": score,
        "checked_at": now,
    }
