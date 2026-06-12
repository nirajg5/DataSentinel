import pandas as pd

def calculate_completeness(df):

    total_cells = (
        df.shape[0] * df.shape[1]
    )

    null_cells = (
        df.isnull().sum().sum()
    )

    score = (
        (
            total_cells - null_cells
        )
        / total_cells
    ) * 100

    return round(score, 2)