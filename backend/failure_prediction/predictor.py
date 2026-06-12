import joblib
import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

# ----------------------------------
# Load Trained Model
# ----------------------------------

model = joblib.load(
    "models/failure_prediction.pkl"
)

# ----------------------------------
# Datasets
# ----------------------------------

datasets = [
    "silver_customers",
    "silver_products",
    "silver_orders",
    "gold_sales_summary"
]

print(
    "Starting Failure Prediction"
)

# ----------------------------------
# Process Each Dataset
# ----------------------------------

for dataset in datasets:

    try:

        # --------------------------
        # Reliability Score
        # --------------------------

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
                ].iloc[0]
            )
            if len(reliability)
            else 100.0
        )

        # --------------------------
        # Freshness Score
        # --------------------------

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
                ].iloc[0]
            )
            if len(freshness)
            else 100.0
        )

        # --------------------------
        # Incident Count
        # --------------------------

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
            ].iloc[0]
        )

        # --------------------------
        # SLA Breach Count
        # --------------------------

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
            ].iloc[0]
        )

        # --------------------------
        # Build Feature Vector
        # --------------------------

        features = pd.DataFrame(
            [[
                reliability_score,
                freshness_score,
                incident_count,
                sla_breach_count
            ]],
            columns=[
                "reliability_score",
                "freshness_score",
                "incident_count",
                "sla_breach_count"
            ]
        )

        # --------------------------
        # Predict Probability
        # --------------------------

        probability = float(
            model.predict_proba(
                features
            )[0][1]
            * 100
        )

        # --------------------------
        # Risk Level
        # --------------------------

        if probability >= 80:

            risk_level = "HIGH"

        elif probability >= 50:

            risk_level = "MEDIUM"

        else:

            risk_level = "LOW"

        # --------------------------
        # Failure Prediction
        # --------------------------

        predicted_failure = bool(
            probability >= 50
        )

        # --------------------------
        # Save Prediction
        # --------------------------

        with engine.begin() as conn:

            conn.execute(
                text("""
                INSERT INTO
                failure_predictions
                (
                    dataset_name,
                    failure_probability,
                    risk_level,
                    predicted_failure
                )
                VALUES
                (
                    :dataset,
                    :probability,
                    :risk,
                    :prediction
                )
                """),
                {
                    "dataset":
                        str(dataset),

                    "probability":
                        float(
                            round(
                                probability,
                                2
                            )
                        ),

                    "risk":
                        str(risk_level),

                    "prediction":
                        bool(
                            predicted_failure
                        )
                }
            )

        print(
            f"{dataset}"
            f" -> "
            f"{round(probability, 2)}%"
            f" | Risk: {risk_level}"
        )

    except Exception as e:

        print(
            f"Failed for "
            f"{dataset}: "
            f"{e}"
        )

print(
    "\nFailure Prediction Complete"
)