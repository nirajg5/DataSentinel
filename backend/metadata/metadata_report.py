import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

metadata = pd.read_sql(
    """
    SELECT *
    FROM metadata_catalog
    ORDER BY layer
    """,
    engine
)

print("\n===== DATASET CATALOG =====\n")

print(metadata[
    [
        "dataset_name",
        "layer",
        "owner_name",
        "total_rows"
    ]
])

print("\nCatalog Generated")