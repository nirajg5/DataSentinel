from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

column_mappings = [

    (
        "bronze_customers",
        "customer_id",
        "silver_customers",
        "customer_id",
        "Direct Mapping"
    ),

    (
        "bronze_customers",
        "name",
        "silver_customers",
        "name",
        "Direct Mapping"
    ),

    (
        "bronze_customers",
        "email",
        "silver_customers",
        "email",
        "Direct Mapping"
    ),

    (
        "silver_orders",
        "quantity",
        "gold_sales_summary",
        "total_quantity",
        "SUM(quantity)"
    ),

    (
        "silver_orders",
        "order_id",
        "gold_sales_summary",
        "total_orders",
        "COUNT(order_id)"
    )
]

with engine.begin() as conn:

    conn.execute(
        text("DELETE FROM column_lineage")
    )

    for mapping in column_mappings:

        conn.execute(
            text("""
            INSERT INTO column_lineage
            (
                source_dataset,
                source_column,
                target_dataset,
                target_column,
                transformation_logic
            )
            VALUES
            (
                :source_dataset,
                :source_column,
                :target_dataset,
                :target_column,
                :logic
            )
            """),
            {
                "source_dataset": mapping[0],
                "source_column": mapping[1],
                "target_dataset": mapping[2],
                "target_column": mapping[3],
                "logic": mapping[4]
            }
        )

print("Column Lineage Registered")