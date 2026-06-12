import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

summary = pd.read_sql(
    """
    SELECT

    root_dataset,

    COUNT(*) AS impacted_assets

    FROM impact_analysis

    GROUP BY root_dataset
    """,
    engine
)

print(
    "\n===== IMPACT SUMMARY =====\n"
)

print(summary)