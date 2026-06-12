import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

from backend.alerts.email_alert import (
    send_email_alert
)

from backend.alerts.slack_alert import (
    send_slack_alert
)

engine = get_engine()

print("Starting Alert Engine")

incidents = pd.read_sql(
    """
    SELECT

    incident_id,
    dataset_name,
    incident_type,
    severity,
    status

    FROM incidents

    WHERE status='OPEN'
    """,
    engine
)

for _, row in incidents.iterrows():

    incident_id = row["incident_id"]

    dataset = row["dataset_name"]

    incident_type = row["incident_type"]

    severity = row["severity"]

    message = (
        f"{incident_type} detected "
        f"for {dataset}"
    )

    existing = pd.read_sql(
        f"""
        SELECT *
        FROM alerts

        WHERE incident_id={incident_id}
        """,
        engine
    )

    if len(existing) > 0:

        continue

    config = pd.read_sql(
        f"""
        SELECT *

        FROM alert_config

        WHERE alert_type=
        '{incident_type}'
        """,
        engine
    )

    if len(config) == 0:

        continue

    email_enabled = (
        config[
            "email_enabled"
        ][0]
    )

    slack_enabled = (
        config[
            "slack_enabled"
        ][0]
    )

    if email_enabled:

        send_email_alert(
            dataset,
            severity,
            message
        )

    if slack_enabled:

        send_slack_alert(
            dataset,
            severity,
            message
        )

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO alerts
            (
                incident_id,
                dataset_name,
                alert_type,
                severity,
                alert_message,
                delivery_status
            )
            VALUES
            (
                :incident_id,
                :dataset,
                :alert_type,
                :severity,
                :message,
                'DELIVERED'
            )
            """),
            {
                "incident_id":
                    incident_id,

                "dataset":
                    dataset,

                "alert_type":
                    incident_type,

                "severity":
                    severity,

                "message":
                    message
            }
        )

print(
    "\nAlert Processing Complete"
)