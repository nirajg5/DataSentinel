import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

alerts = pd.read_sql(
    """
    SELECT

    alert_id,
    dataset_name,
    alert_type,
    severity,
    delivery_status

    FROM alerts

    ORDER BY alert_id DESC
    """,
    engine
)

print(
    "\n===== ALERT REPORT =====\n"
)

print(alerts)