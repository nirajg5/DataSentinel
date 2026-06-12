import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

query = """
SELECT
dataset_name,
reliability_score,
calculated_at

FROM reliability_scores

ORDER BY reliability_score DESC
"""

df = pd.read_sql(
    query,
    engine
)

print("\n===== RELIABILITY REPORT =====\n")

print(df)