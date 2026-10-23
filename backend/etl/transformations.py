import pandas as pd


def clean_customers(dataframe: pd.DataFrame) -> pd.DataFrame:
    df = dataframe.copy()

    df["customer_name"] = (
        df["customer_name"].astype("string").str.strip()
    )
    df["email"] = (
        df["email"].astype("string").str.strip().str.lower()
    )
    df["city"] = df["city"].astype("string").str.strip()
    df["country"] = df["country"].astype("string").str.strip()

    df["created_at"] = pd.to_datetime(
        df["created_at"], errors="raise"
    )

    df = df.drop_duplicates(
        subset=["customer_id"], keep="last"
    )

    if df["customer_id"].isna().any():
        raise ValueError("Customer IDs cannot be null")

    if df["email"].eq("").any():
        raise ValueError("Customer emails cannot be empty")

    return df


def clean_products(dataframe: pd.DataFrame) -> pd.DataFrame:
    df = dataframe.copy()

    df["product_name"] = (
        df["product_name"].astype("string").str.strip()
    )
    df["category"] = (
        df["category"].astype("string").str.strip()
    )

    df["price"] = pd.to_numeric(df["price"], errors="raise")
    df["stock_quantity"] = pd.to_numeric(
        df["stock_quantity"], errors="raise"
    ).astype("int64")

    df = df.drop_duplicates(
        subset=["product_id"], keep="last"
    )

    if (df["price"] < 0).any():
        raise ValueError("Product price cannot be negative")

    if (df["stock_quantity"] < 0).any():
        raise ValueError("Stock quantity cannot be negative")

    return df


def clean_orders(dataframe: pd.DataFrame) -> pd.DataFrame:
    df = dataframe.copy()

    df["quantity"] = pd.to_numeric(
        df["quantity"], errors="raise"
    ).astype("int64")

    df["order_date"] = pd.to_datetime(
        df["order_date"], errors="raise"
    )

    df = df.drop_duplicates(
        subset=["order_id"], keep="last"
    )

    if (df["quantity"] <= 0).any():
        raise ValueError("Order quantity must be positive")

    return df