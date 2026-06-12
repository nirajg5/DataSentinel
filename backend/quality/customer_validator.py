import pandas as pd
import great_expectations as gx

def validate_customers(df):

    gx_df = gx.from_pandas(df)

    results = []

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "customer_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_be_unique(
            "customer_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "name"
        )
    )

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "email"
        )
    )

    results.append(
        gx_df.expect_column_values_to_match_regex(
            "email",
            r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
        )
    )

    return results