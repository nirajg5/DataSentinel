import great_expectations as gx

def validate_orders(df):

    gx_df = gx.from_pandas(df)

    results = []

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "order_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_be_unique(
            "order_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "customer_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "product_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_be_between(
            "quantity",
            min_value=1,
            max_value=1000
        )
    )

    return results