from sqlalchemy import text

from backend.ingestion.db_connection import get_engine
from .lineage_registry import LINEAGE_REGISTRY

engine = get_engine()

print("Registering Data Lineage")

with engine.begin() as conn:

    conn.execute(
        text("DELETE FROM data_lineage")
    )

    for lineage in LINEAGE_REGISTRY:

        conn.execute(
            text("""
            INSERT INTO data_lineage
            (
                source_dataset,
                target_dataset,
                transformation_type
            )
            VALUES
            (
                :source,
                :target,
                :transformation
            )
            """),
            {
                "source":
                    lineage["source"],

                "target":
                    lineage["target"],

                "transformation":
                    lineage["transformation"]
            }
        )

print("Lineage Registration Complete")