import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

report = pd.read_sql(
    """
    SELECT

    dataset_name,

    failure_probability,

    risk_level,

    prediction_time

    FROM failure_predictions

    ORDER BY prediction_time DESC
    """,
    engine
)

print(
    "\n===== FAILURE PREDICTIONS =====\n"
)

print(report)