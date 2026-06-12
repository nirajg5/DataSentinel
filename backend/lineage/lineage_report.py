import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

lineage = pd.read_sql(
    """
    SELECT *
    FROM data_lineage
    """,
    engine
)

print("\n===== DATA LINEAGE =====\n")

print(
    lineage[
        [
            "source_dataset",
            "target_dataset",
            "transformation_type"
        ]
    ]
)