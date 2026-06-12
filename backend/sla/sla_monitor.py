import pandas as pd

from datetime import datetime

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

print("Starting SLA Monitoring")

sla_df = pd.read_sql(
    """
    SELECT *
    FROM dataset_sla
    """,
    engine
)

for _, row in sla_df.iterrows():

    dataset = row["dataset_name"]

    expected_hour = row["expected_hour"]

    expected_minute = row["expected_minute"]

    # ---------------------------------
    # Get Latest Dataset Update Time
    # ---------------------------------

    query = f"""
    SELECT MAX(ingestion_timestamp)
    AS actual_time
    FROM {dataset}
    """

    actual_df = pd.read_sql(
        query,
        engine
    )

    actual_time = actual_df[
        "actual_time"
    ][0]

    if pd.isna(actual_time):

        continue

    actual_time = pd.to_datetime(
        actual_time
    )

    # ---------------------------------
    # Build Expected Time
    # ---------------------------------

    expected_time = actual_time.replace(
        hour=expected_hour,
        minute=expected_minute,
        second=0,
        microsecond=0
    )

    delay_minutes = (
        actual_time - expected_time
    ).total_seconds() / 60

    # ---------------------------------
    # SLA Status
    # ---------------------------------

    if delay_minutes <= 0:

        status = "ON_TIME"

    else:

        status = "BREACH"

    # ---------------------------------
    # Save SLA Result
    # ---------------------------------

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO sla_monitoring
            (
                dataset_name,
                expected_time,
                actual_time,
                delay_minutes,
                sla_status
            )
            VALUES
            (
                :dataset,
                :expected,
                :actual,
                :delay,
                :status
            )
            """),
            {
                "dataset": dataset,
                "expected": expected_time,
                "actual": actual_time,
                "delay": round(
                    delay_minutes,
                    2
                ),
                "status": status
            }
        )

    print(
        f"{dataset} -> {status}"
    )

    # ---------------------------------
    # Create Incident
    # ---------------------------------

    if status == "BREACH":

        with engine.begin() as conn:

            conn.execute(
                text("""
                INSERT INTO quality_incidents
                (
                    dataset_name,
                    issue_type,
                    issue_description,
                    severity
                )
                VALUES
                (
                    :dataset,
                    'SLA Breach',
                    'Dataset arrived later than expected',
                    'HIGH'
                )
                """),
                {
                    "dataset": dataset
                }
            )

print("\nSLA Monitoring Completed")