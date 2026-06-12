import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

def get_table_details(table_name):

    row_query = f"""
    SELECT COUNT(*) AS total_rows
    FROM {table_name}
    """

    row_df = pd.read_sql(
        row_query,
        engine
    )

    rows = int(
        row_df["total_rows"][0]
    )

    column_query = f"""
    SELECT
        column_name,
        data_type,
        is_nullable
    FROM information_schema.columns
    WHERE table_name = '{table_name}'
    """

    columns_df = pd.read_sql(
        column_query,
        engine
    )

    return rows, columns_df