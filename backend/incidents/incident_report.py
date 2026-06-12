import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

query = """
SELECT

incident_id,
dataset_name,
incident_type,
severity,
status,
created_at

FROM incidents

ORDER BY created_at DESC
"""

df = pd.read_sql(
    query,
    engine
)

print(
    "\n===== INCIDENT REPORT =====\n"
)

print(df)