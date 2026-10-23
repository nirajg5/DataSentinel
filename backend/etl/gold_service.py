
import pandas as pd
from sqlalchemy import inspect
from backend.database.database import engine


def build_gold_tables() -> dict:
    required_tables = [
        "silver_customers",
        "silver_products",
        "silver_orders",
    ]

    inspector = inspect(engine)

    missing_tables = [
        table for table in required_tables
        if not inspector.has_table(table)
    ]

    if missing_tables:
        raise ValueError(
            f"Missing Silver tables: {missing_tables}. "
            "Run Silver ETL first."
        )

    # Read cleaned Silver data
    with engine.connect() as connection:
        customers = pd.read_sql(
            'SELECT * FROM silver_customers', connection
        )
        products = pd.read_sql(
            'SELECT * FROM silver_products', connection
        )
        orders = pd.read_sql(
            'SELECT * FROM silver_orders', connection
        )

    # Check required columns
    required_columns = {
        "customers": {"customer_id"},
        "products": {"product_id", "price", "stock_quantity"},
        "orders": {
            "order_id", "customer_id", "product_id",
            "quantity", "order_date",
        },
    }

    datasets = {
        "customers": customers,
        "products": products,
        "orders": orders,
    }

    for name, columns in required_columns.items():
        missing = columns - set(datasets[name].columns)
        if missing:
            raise ValueError(
                f"{name} is missing columns: {sorted(missing)}"
            )

    # Convert numeric columns safely
    orders["quantity"] = pd.to_numeric(
        orders["quantity"], errors="raise"
    )
    products["price"] = pd.to_numeric(
        products["price"], errors="raise"
    )
    products["stock_quantity"] = pd.to_numeric(
        products["stock_quantity"], errors="raise"
    )

    # Join orders with products to calculate revenue
    order_details = orders.merge(
        products[["product_id", "price"]],
        on="product_id",
        how="left",
        validate="many_to_one",
        indicator=True,
    )

    unmatched_products = int(
        (order_details["_merge"] != "both").sum()
    )

    if unmatched_products:
        raise ValueError(
            f"{unmatched_products} order rows reference "
            "products absent from silver_products."
        )

    order_details = order_details.drop(columns=["_merge"])
    order_details["revenue"] = (
        order_details["quantity"] * order_details["price"]
    )

    # Gold 1: Customer summary
    customer_orders = (
        order_details.groupby("customer_id", as_index=False)
        .agg(
            order_count=("order_id", "nunique"),
            total_units=("quantity", "sum"),
            total_spent=("revenue", "sum"),
        )
    )

    gold_customer = customers.merge(
        customer_orders,
        on="customer_id",
        how="left",
        validate="one_to_one",
    )

    for column in ["order_count", "total_units", "total_spent"]:
        gold_customer[column] = gold_customer[column].fillna(0)

    gold_customer["order_count"] = (
        gold_customer["order_count"].astype(int)
    )
    gold_customer["total_units"] = (
        gold_customer["total_units"].astype(int)
    )

    # Gold 2: Product performance
    product_sales = (
        order_details.groupby("product_id", as_index=False)
        .agg(
            units_sold=("quantity", "sum"),
            order_count=("order_id", "nunique"),
            revenue=("revenue", "sum"),
        )
    )

    gold_product = products.merge(
        product_sales,
        on="product_id",
        how="left",
        validate="one_to_one",
    )

    for column in ["units_sold", "order_count", "revenue"]:
        gold_product[column] = gold_product[column].fillna(0)

    gold_product["units_sold"] = (
        gold_product["units_sold"].astype(int)
    )
    gold_product["order_count"] = (
        gold_product["order_count"].astype(int)
    )

    # Gold 3: Daily sales
    order_details["order_date"] = pd.to_datetime(
        order_details["order_date"], errors="raise"
    ).dt.date

    gold_daily = (
        order_details.groupby("order_date", as_index=False)
        .agg(
            order_count=("order_id", "nunique"),
            units_sold=("quantity", "sum"),
            revenue=("revenue", "sum"),
        )
        .sort_values("order_date")
    )

    # Write Gold tables
    gold_tables = {
        "gold_customer_summary": gold_customer,
        "gold_product_performance": gold_product,
        "gold_daily_sales": gold_daily,
    }

    for table_name, dataframe in gold_tables.items():
        dataframe.to_sql(
            table_name,
            con=engine,
            if_exists="replace",
            index=False,
        )

    return {
        "status": "SUCCESS",
        "tables_created": list(gold_tables.keys()),
        "row_counts": {
            name: len(dataframe)
            for name, dataframe in gold_tables.items()
        },
        "unmatched_products": unmatched_products,
    }
