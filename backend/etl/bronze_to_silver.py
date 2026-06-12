import pandas as pd
from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

print("Starting Bronze → Silver ETL")

# ==================================================
# CUSTOMERS
# ==================================================

customers = pd.read_sql(
    "SELECT * FROM bronze_customers",
    engine
)

customers = customers.drop_duplicates(
    subset=["customer_id"]
)

customers = customers.dropna(
    subset=["customer_id", "name"]
)

customers["customer_id"] = customers["customer_id"].astype(int)

customers.to_sql(
    "silver_customers",
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
        ('silver','silver_customers',:cnt,'SUCCESS')
        """),
        {"cnt": len(customers)}
    )

print("silver_customers loaded")

# ==================================================
# PRODUCTS
# ==================================================

products = pd.read_sql(
    "SELECT * FROM bronze_products",
    engine
)

products = products.drop_duplicates(
    subset=["product_id"]
)

products = products.dropna(
    subset=["product_id","product_name"]
)

products["price"] = products["price"].fillna(0)

products.to_sql(
    "silver_products",
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
        ('silver','silver_products',:cnt,'SUCCESS')
        """),
        {"cnt": len(products)}
    )

print("silver_products loaded")

# ==================================================
# ORDERS
# ==================================================

orders = pd.read_sql(
    "SELECT * FROM bronze_orders",
    engine
)

orders = orders.drop_duplicates(
    subset=["order_id"]
)

orders = orders.dropna(
    subset=["order_id"]
)

orders["quantity"] = orders["quantity"].fillna(1)

orders.to_sql(
    "silver_orders",
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
        ('silver','silver_orders',:cnt,'SUCCESS')
        """),
        {"cnt": len(orders)}
    )

print("silver_orders loaded")

print("Bronze → Silver ETL Completed")