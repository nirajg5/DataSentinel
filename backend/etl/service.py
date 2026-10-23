import pandas as pd
from sqlalchemy import inspect, text

from backend.database.database import engine
from backend.etl.transformations import (
    clean_customers,
    clean_products,
    clean_orders,
)

TRANSFORMATIONS = {
    "customers": clean_customers,
    "products": clean_products,
    "orders": clean_orders,
}


def transform_bronze_to_silver(dataset_type: str) -> dict:
    dataset_type = dataset_type.strip().lower()

    if dataset_type not in TRANSFORMATIONS:
        raise ValueError(
            f"Unsupported dataset type: {dataset_type}. "
            f"Supported types: {list(TRANSFORMATIONS)}"
        )

    bronze_table = f"bronze_{dataset_type}"
    silver_table = f"silver_{dataset_type}"

    inspector = inspect(engine)

    if not inspector.has_table(bronze_table):
        raise ValueError(
            f"Bronze table does not exist: {bronze_table}. "
            "Run Bronze ingestion first."
        )

    with engine.connect() as connection:
        dataframe = pd.read_sql(
            text(f'SELECT * FROM "{bronze_table}"'),
            connection,
        )

    transformed = TRANSFORMATIONS[dataset_type](dataframe)

    transformed.to_sql(
        silver_table,
        con=engine,
        if_exists="replace",
        index=False,
    )

    return {
        "dataset_type": dataset_type,
        "source_table": bronze_table,
        "target_table": silver_table,
        "rows_read": len(dataframe),
        "rows_written": len(transformed),
        "status": "SUCCESS",
    }