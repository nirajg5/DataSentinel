import pandas as pd
from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

print("Starting Silver → Gold ETL")

customers = pd.read_sql(
    "SELECT * FROM silver_customers",
    engine
)

orders = pd.read_sql(
    "SELECT * FROM silver_orders",
    engine
)

products = pd.read_sql(
    "SELECT * FROM silver_products",
    engine
)

# ==================================================
# JOIN TABLES
# ==================================================

sales = orders.merge(
    customers,
    on="customer_id",
    how="left"
)

sales = sales.merge(
    products,
    on="product_id",
    how="left"
)

sales["sales_amount"] = (
    sales["quantity"] * sales["price"]
)

# ==================================================
# AGGREGATION
# ==================================================

gold = (
    sales.groupby(
        [
            "customer_id",
            "name",
            "city"
        ]
    )
    .agg(
        total_orders=("order_id", "count"),
        total_quantity=("quantity", "sum"),
        total_sales=("sales_amount", "sum")
    )
    .reset_index()
)

gold.rename(
    columns={
        "name": "customer_name"
    },
    inplace=True
)

gold["last_updated"] = pd.Timestamp.now()

gold.to_sql(
    "gold_sales_summary",
    engine,
    if_exists="replace",
    index=False
)

with engine.begin() as conn:
    conn.execute(
        text("""
        INSERT INTO etl_logs
        (layer, table_name, records_processed, status)
        VALUES
        ('gold','gold_sales_summary',:cnt,'SUCCESS')
        """),
        {"cnt": len(gold)}
    )

print("gold_sales_summary loaded")

print("Silver → Gold ETL Completed")