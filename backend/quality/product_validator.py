import great_expectations as gx

def validate_products(df):

    gx_df = gx.from_pandas(df)

    results = []

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "product_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_be_unique(
            "product_id"
        )
    )

    results.append(
        gx_df.expect_column_values_to_not_be_null(
            "product_name"
        )
    )

    results.append(
        gx_df.expect_column_values_to_be_between(
            "price",
            min_value=0,
            max_value=100000
        )
    )

    return results