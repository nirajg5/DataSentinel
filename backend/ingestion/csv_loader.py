import pandas as pd
from sqlalchemy import text
from db_connection import get_engine

engine = get_engine()

# ---------------------------------
# Load Customers
# ---------------------------------

customers_df = pd.read_csv(
    "../../data/raw/customers.csv"
)

customers_df.to_sql(
    "bronze_customers",
    engine,
    if_exists="append",
    index=False
)

# Log Customers Ingestion
with engine.begin() as conn:
    conn.execute(
        text("""
        INSERT INTO ingestion_logs
        (dataset_name, records_loaded, status)
        VALUES
        ('customers', :count, 'SUCCESS')
        """),
        {"count": len(customers_df)}
    )

print(f"Customers Loaded: {len(customers_df)} records")


# ---------------------------------
# Load Products
# ---------------------------------

products_df = pd.read_csv(
    "../../data/raw/products.csv"
)

products_df.to_sql(
    "bronze_products",
    engine,
    if_exists="append",
    index=False
)

# Log Products Ingestion
with engine.begin() as conn:
    conn.execute(
        text("""
        INSERT INTO ingestion_logs
        (dataset_name, records_loaded, status)
        VALUES
        ('products', :count, 'SUCCESS')
        """),
        {"count": len(products_df)}
    )

print(f"Products Loaded: {len(products_df)} records")


# ---------------------------------
# Load Orders
# ---------------------------------

orders_df = pd.read_csv(
    "../../data/raw/orders.csv"
)

orders_df.to_sql(
    "bronze_orders",
    engine,
    if_exists="append",
    index=False
)

# Log Orders Ingestion
with engine.begin() as conn:
    conn.execute(
        text("""
        INSERT INTO ingestion_logs
        (dataset_name, records_loaded, status)
        VALUES
        ('orders', :count, 'SUCCESS')
        """),
        {"count": len(orders_df)}
    )

print(f"Orders Loaded: {len(orders_df)} records")

print("\nAll Bronze Data Loaded Successfully")