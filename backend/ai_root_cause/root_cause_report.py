import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

report = pd.read_sql(
    """
    SELECT

    incident_id,

    dataset_name,

    ai_analysis

    FROM root_cause_analysis

    ORDER BY analysis_id DESC
    """,
    engine
)

for _, row in report.iterrows():

    print(
        "\n===================="
    )

    print(
        f"\nIncident : "
        f"{row['incident_id']}"
    )

    print(
        f"\nDataset : "
        f"{row['dataset_name']}"
    )

    print(
        f"\nAnalysis :\n"
    )

    print(
        row["ai_analysis"]
    )