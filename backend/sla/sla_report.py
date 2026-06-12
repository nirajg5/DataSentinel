import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

query = """
SELECT

dataset_name,
delay_minutes,
sla_status,
checked_at

FROM sla_monitoring

ORDER BY checked_at DESC
"""

df = pd.read_sql(
    query,
    engine
)

print(
    "\n===== SLA REPORT =====\n"
)

print(df)