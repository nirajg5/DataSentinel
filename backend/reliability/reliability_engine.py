import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

from .completeness_score import (
    calculate_completeness
)

from .uniqueness_score import (
    calculate_uniqueness
)

from .schema_stability import (
    calculate_schema_score
)
engine = get_engine()

DATASETS = {

    "silver_customers": "customer_id",

    "silver_products": "product_id",

    "silver_orders": "order_id",

    "gold_sales_summary": "customer_id"
}

print("Calculating Reliability Scores")

for dataset, pk in DATASETS.items():

    print(f"\nProcessing {dataset}")

    # ----------------------------
    # Read Dataset
    # ----------------------------

    df = pd.read_sql(
        f"SELECT * FROM {dataset}",
        engine
    )

    # ----------------------------
    # Freshness Score
    # ----------------------------

    freshness_query = f"""
    SELECT freshness_score
    FROM dataset_freshness
    WHERE dataset_name='{dataset}'
    ORDER BY actual_update_time DESC
    LIMIT 1
    """

    freshness_df = pd.read_sql(
        freshness_query,
        engine
    )

    if len(freshness_df):

        freshness_score = float(
            freshness_df[
                "freshness_score"
            ][0]
        )

    else:

        freshness_score = 100

    # ----------------------------
    # Completeness
    # ----------------------------

    completeness_score = (
        calculate_completeness(df)
    )

    # ----------------------------
    # Uniqueness
    # ----------------------------

    uniqueness_score = (
        calculate_uniqueness(
            df,
            pk
        )
    )

    # ----------------------------
    # Schema Stability
    # ----------------------------

    schema_score = (
        calculate_schema_score()
    )

    # ----------------------------
    # Incident Score
    # ----------------------------

    incident_query = f"""
    SELECT COUNT(*)
    AS incident_count
    FROM quality_incidents
    WHERE dataset_name='{dataset}'
    """

    incident_df = pd.read_sql(
        incident_query,
        engine
    )

    incidents = int(
        incident_df[
            "incident_count"
        ][0]
    )

    incident_score = max(
        0,
        100 - (incidents * 10)
    )

    # ----------------------------
    # Reliability Formula
    # ----------------------------

    reliability_score = (

        freshness_score * 0.25

        +

        completeness_score * 0.25

        +

        uniqueness_score * 0.20

        +

        schema_score * 0.15

        +

        incident_score * 0.15

    )

    reliability_score = round(
        reliability_score,
        2
    )

    # ----------------------------
    # Save Result
    # ----------------------------

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO reliability_scores
            (
                dataset_name,
                freshness_score,
                completeness_score,
                uniqueness_score,
                schema_score,
                incident_score,
                reliability_score
            )
            VALUES
            (
                :dataset,
                :freshness,
                :completeness,
                :uniqueness,
                :schema,
                :incident,
                :reliability
            )
            """),
            {
                "dataset": dataset,
                "freshness": freshness_score,
                "completeness": completeness_score,
                "uniqueness": uniqueness_score,
                "schema": schema_score,
                "incident": incident_score,
                "reliability": reliability_score
            }
        )

    print(
        f"Reliability Score = "
        f"{reliability_score}%"
    )

print("\nReliability Calculation Completed")