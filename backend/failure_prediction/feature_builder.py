import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

print("Building Training Dataset")

datasets = [

    "silver_customers",
    "silver_products",
    "silver_orders",
    "gold_sales_summary"
]

records = []

for dataset in datasets:

    # -------------------------
    # Reliability Score
    # -------------------------

    reliability_query = f"""
    SELECT reliability_score

    FROM reliability_scores

    WHERE dataset_name='{dataset}'

    ORDER BY score_id DESC

    LIMIT 1
    """

    reliability = pd.read_sql(
        reliability_query,
        engine
    )

    reliability_score = (

        float(
            reliability[
                "reliability_score"
            ][0]
        )

        if len(reliability)

        else 100
    )

    # -------------------------
    # Freshness Score
    # -------------------------

    freshness_query = f"""
    SELECT freshness_score

    FROM dataset_freshness

    WHERE dataset_name='{dataset}'

    ORDER BY actual_update_time DESC

    LIMIT 1
    """

    freshness = pd.read_sql(
        freshness_query,
        engine
    )

    freshness_score = (

        float(
            freshness[
                "freshness_score"
            ][0]
        )

        if len(freshness)

        else 100
    )

    # -------------------------
    # Incident Count
    # -------------------------

    incident_query = f"""
    SELECT COUNT(*)

    AS total_incidents

    FROM incidents

    WHERE dataset_name='{dataset}'
    """

    incidents = pd.read_sql(
        incident_query,
        engine
    )

    incident_count = int(
        incidents[
            "total_incidents"
        ][0]
    )

    # -------------------------
    # SLA Breaches
    # -------------------------

    sla_query = f"""
    SELECT COUNT(*)

    AS breaches

    FROM sla_monitoring

    WHERE dataset_name='{dataset}'

    AND sla_status='BREACH'
    """

    sla = pd.read_sql(
        sla_query,
        engine
    )

    sla_breach_count = int(
        sla[
            "breaches"
        ][0]
    )

    # -------------------------
    # Target Label
    # -------------------------

    failure_label = (

        1

        if (
            incident_count > 2
            or
            reliability_score < 80
        )

        else 0
    )

    records.append({

        "dataset_name":
            dataset,

        "reliability_score":
            reliability_score,

        "freshness_score":
            freshness_score,

        "incident_count":
            incident_count,

        "sla_breach_count":
            sla_breach_count,

        "failure_label":
            failure_label
    })

feature_df = pd.DataFrame(
    records
)

feature_df.to_csv(
    "training_data.csv",
    index=False
)

print(feature_df)

print(
    "\nTraining Dataset Created"
)