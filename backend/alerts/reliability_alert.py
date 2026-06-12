import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

scores = pd.read_sql(
    """
    SELECT

    dataset_name,
    reliability_score

    FROM reliability_scores
    """,
    engine
)

for _, row in scores.iterrows():

    if row[
        "reliability_score"
    ] < 80:

        print(
            f"ALERT: "
            f"{row['dataset_name']} "
            f"Reliability Dropped"
        )