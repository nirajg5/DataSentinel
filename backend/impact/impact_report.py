import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

query = """
SELECT

incident_id,
root_dataset,
impacted_asset,
impact_level

FROM impact_analysis

ORDER BY incident_id
"""

df = pd.read_sql(
    query,
    engine
)

print(
    "\n===== IMPACT REPORT =====\n"
)

print(df)