import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

from .dataset_registry import DATASET_REGISTRY
from .dataset_scanner import get_table_details

engine = get_engine()

print("Registering Metadata")

for dataset_name, config in DATASET_REGISTRY.items():

    try:

        rows, columns_df = get_table_details(
            dataset_name
        )

        total_columns = len(columns_df)

        with engine.begin() as conn:

            conn.execute(
                text("""
                INSERT INTO metadata_catalog
                (
                    dataset_name,
                    layer,
                    description,
                    owner_name,
                    tags,
                    source_system,
                    update_frequency,
                    sla_hours,
                    total_columns,
                    total_rows
                )
                VALUES
                (
                    :dataset_name,
                    :layer,
                    :description,
                    :owner,
                    :tags,
                    :source,
                    :frequency,
                    :sla,
                    :columns,
                    :rows
                )
                ON CONFLICT (dataset_name)
                DO UPDATE SET

                    total_rows = EXCLUDED.total_rows,
                    total_columns = EXCLUDED.total_columns,
                    last_updated = CURRENT_TIMESTAMP
                """),
                {
                    "dataset_name": dataset_name,
                    "layer": config["layer"],
                    "description": config["description"],
                    "owner": config["owner"],
                    "tags": config["tags"],
                    "source": config["source"],
                    "frequency": config["frequency"],
                    "sla": config["sla"],
                    "columns": total_columns,
                    "rows": rows
                }
            )

            for _, row in columns_df.iterrows():

                conn.execute(
                    text("""
                    INSERT INTO column_metadata
                    (
                        dataset_name,
                        column_name,
                        data_type,
                        nullable
                    )
                    VALUES
                    (
                        :dataset,
                        :column_name,
                        :data_type,
                        :nullable
                    )
                    """),
                    {
                        "dataset": dataset_name,
                        "column_name": row["column_name"],
                        "data_type": row["data_type"],
                        "nullable":
                            row["is_nullable"] == "YES"
                    }
                )

        print(
            f"Registered {dataset_name}"
        )

    except Exception as e:

        print(
            f"Error in {dataset_name}"
        )

        print(e)

print("Metadata Registration Complete")