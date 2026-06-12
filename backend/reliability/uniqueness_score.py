def calculate_uniqueness(
    df,
    primary_key
):

    total_rows = len(df)

    unique_rows = len(
        df.drop_duplicates(
            subset=[primary_key]
        )
    )

    score = (
        unique_rows
        /
        total_rows
    ) * 100

    return round(score, 2)