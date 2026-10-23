import pandas as pd


EXPECTED_COLUMNS = {
    "customers": [
        "customer_id",
        "customer_name",
        "email",
        "city",
        "country",
        "created_at",
    ],
    "products": [
        "product_id",
        "product_name",
        "category",
        "price",
        "stock_quantity",
    ],
    "orders": [
        "order_id",
        "customer_id",
        "product_id",
        "quantity",
        "order_date",
    ],
}


def validate_dataframe(
    dataframe: pd.DataFrame,
    dataset_type: str,
) -> None:
    if dataset_type not in EXPECTED_COLUMNS:
        raise ValueError(
            f"Unsupported dataset type: {dataset_type}"
        )

    if dataframe.empty:
        raise ValueError("Dataset is empty")

    expected = EXPECTED_COLUMNS[dataset_type]
    actual = dataframe.columns.tolist()

    if actual != expected:
        raise ValueError(
            f"Schema mismatch. Expected {expected}; received {actual}"
        )

    if dataframe.isnull().any().any():
        raise ValueError(
            "Dataset contains null values in required fields"
        )