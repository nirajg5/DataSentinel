import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

print("Creating Incidents")

quality_df = pd.read_sql(
    """
    SELECT *
    FROM quality_incidents
    """,
    engine
)

for _, row in quality_df.iterrows():

    dataset = row["dataset_name"]
    issue_type = row["issue_type"]
    description = row["issue_description"]
    severity = row["severity"]

    # -----------------------------------
    # Check Existing Open Incident
    # -----------------------------------

    existing = pd.read_sql(
        f"""
        SELECT *
        FROM incidents

        WHERE dataset_name='{dataset}'
        AND incident_type='{issue_type}'
        AND status='OPEN'
        """,
        engine
    )

    # -----------------------------------
    # Insert Only If Not Exists
    # -----------------------------------

    if len(existing) == 0:

        with engine.begin() as conn:

            conn.execute(
                text("""
                INSERT INTO incidents
                (
                    dataset_name,
                    incident_type,
                    incident_description,
                    severity,
                    status,
                    owner
                )
                VALUES
                (
                    :dataset,
                    :type,
                    :description,
                    :severity,
                    'OPEN',
                    'Data Engineering Team'
                )
                """),
                {
                    "dataset": dataset,
                    "type": issue_type,
                    "description": description,
                    "severity": severity
                }
            )

        print(
            f"Created Incident: {dataset}"
        )

    else:

        print(
            f"Skipped Duplicate Incident: {dataset}"
        )