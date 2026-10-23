from pathlib import Path

import pandas as pd


SOURCE_DIR = Path("data/source")


def test_source_files_exist():
    for filename in (
        "customers.csv",
        "products.csv",
        "orders.csv",
    ):
        assert (SOURCE_DIR / filename).is_file()


def test_source_files_are_not_empty():
    for filename in (
        "customers.csv",
        "products.csv",
        "orders.csv",
    ):
        dataframe = pd.read_csv(SOURCE_DIR / filename)
        assert not dataframe.empty


def test_source_columns():
    expected_columns = {
        "customers.csv": [
            "customer_id",
            "customer_name",
            "email",
            "city",
            "country",
            "created_at",
        ],
        "products.csv": [
            "product_id",
            "product_name",
            "category",
            "price",
            "stock_quantity",
        ],
        "orders.csv": [
            "order_id",
            "customer_id",
            "product_id",
            "quantity",
            "order_date",
        ],
    }

    for filename, columns in expected_columns.items():
        dataframe = pd.read_csv(SOURCE_DIR / filename)
        assert dataframe.columns.tolist() == columns