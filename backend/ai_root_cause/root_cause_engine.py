import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

from backend.ai_root_cause.llm_analyzer import (
    generate_root_cause
)

engine = get_engine()

print(
    "Starting AI Root Cause Analysis"
)

# Process only recent OPEN incidents
incidents = pd.read_sql(
    """
    SELECT
        incident_id,
        dataset_name,
        incident_type,
        incident_description
    FROM incidents
    WHERE status='OPEN'
    ORDER BY incident_id
    LIMIT 20
    """,
    engine
)

processed = 0

for _, incident in incidents.iterrows():

    try:

        incident_id = incident["incident_id"]
        dataset = incident["dataset_name"]
        incident_type = incident["incident_type"]
        description = incident["incident_description"]

        # Skip if already analyzed
        existing = pd.read_sql(
            f"""
            SELECT 1
            FROM root_cause_analysis
            WHERE incident_id={incident_id}
            LIMIT 1
            """,
            engine
        )

        if len(existing):
            continue

        # ----------------------------
        # Reliability Score
        # ----------------------------

        reliability = pd.read_sql(
            f"""
            SELECT reliability_score
            FROM reliability_scores
            WHERE dataset_name='{dataset}'
            ORDER BY score_id DESC
            LIMIT 1
            """,
            engine
        )

        reliability_score = (
            float(
                reliability["reliability_score"][0]
            )
            if len(reliability)
            else 100.0
        )

        # ----------------------------
        # Impacted Assets
        # ----------------------------

        impacts = pd.read_sql(
            f"""
            SELECT impacted_asset
            FROM impact_analysis
            WHERE incident_id={incident_id}
            """,
            engine
        )

        impacted_assets = impacts[
            "impacted_asset"
        ].tolist()

        impacted_assets_text = (
            ", ".join(impacted_assets)
            if impacted_assets
            else "None"
        )

        # ----------------------------
        # Compact Prompt
        # ----------------------------

        prompt = f"""
Dataset: {dataset}

Issue Type: {incident_type}

Description: {description}

Reliability Score: {reliability_score}

Impacted Assets: {impacted_assets_text}

Provide:
1. Root Cause
2. Business Impact
3. Severity
4. Recommendation

Keep response under 200 words.
"""

        ai_analysis = (
            generate_root_cause(prompt)
        )

        # ----------------------------
        # Save Analysis
        # ----------------------------

        with engine.begin() as conn:

            conn.execute(
                text("""
                INSERT INTO root_cause_analysis
                (
                    incident_id,
                    dataset_name,
                    ai_analysis
                )
                VALUES
                (
                    :incident_id,
                    :dataset,
                    :analysis
                )
                """),
                {
                    "incident_id": incident_id,
                    "dataset": dataset,
                    "analysis": ai_analysis
                }
            )

        processed += 1

        print(
            f"Analysis Created for Incident "
            f"{incident_id}"
        )

    except Exception as e:

        print(
            f"Failed for Incident "
            f"{incident_id}: {e}"
        )

print(
    f"\nAI Root Cause Analysis Completed"
)

print(
    f"Total Analyses Created: {processed}"
)