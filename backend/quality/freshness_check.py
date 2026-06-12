import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

tables = [
    "silver_customers",
    "silver_products",
    "silver_orders"
]

print("Starting Freshness Check...\n")

for table in tables:

    try:

        query = f"""
        SELECT MAX(ingestion_timestamp) AS last_update
        FROM {table}
        """

        df = pd.read_sql(query, engine)

        last_update = df["last_update"].iloc[0]

        # ------------------------------------
        # Handle Empty Tables
        # ------------------------------------
        if pd.isna(last_update):

            status = "NO_DATA"
            freshness_score = 0

            print(f"{table} -> NO DATA")

        else:

            # Convert Timestamp if needed
            last_update = pd.to_datetime(last_update)

            time_difference = datetime.now() - last_update

            if time_difference > timedelta(days=1):
                status = "STALE"
                freshness_score = 0
            else:
                status = "FRESH"
                freshness_score = 100

            print(
                f"{table} -> {status} "
                f"(Last Update: {last_update})"
            )

        # ------------------------------------
        # Store Freshness Result
        # ------------------------------------

        with engine.begin() as conn:

            conn.execute(
                text("""
                INSERT INTO dataset_freshness
                (
                    dataset_name,
                    expected_update_time,
                    actual_update_time,
                    freshness_status,
                    freshness_score
                )
                VALUES
                (
                    :dataset,
                    :expected_time,
                    :actual_time,
                    :status,
                    :score
                )
                """),
                {
                    "dataset": table,
                    "expected_time": datetime.now(),
                    "actual_time": last_update,
                    "status": status,
                    "score": freshness_score
                }
            )

        # ------------------------------------
        # Create Incident if STALE
        # ------------------------------------

        if status == "STALE":

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
                        'Freshness Failure',
                        'Dataset has not been updated within SLA window',
                        'HIGH'
                    )
                    """),
                    {
                        "dataset": table
                    }
                )

            print(
                f"Incident Created for {table}"
            )

    except Exception as e:

        print(
            f"Error checking {table}: {str(e)}"
        )

print("\nFreshness Check Completed")