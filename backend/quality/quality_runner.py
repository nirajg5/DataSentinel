import pandas as pd

from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

from backend.quality.customer_validator import validate_customers
from backend.quality.product_validator import validate_products
from backend.quality.order_validator import validate_orders

engine = get_engine()

print("Starting Data Quality Validation")

datasets = {

    "customers": {
        "table": "silver_customers",
        "validator": validate_customers
    },

    "products": {
        "table": "silver_products",
        "validator": validate_products
    },

    "orders": {
        "table": "silver_orders",
        "validator": validate_orders
    }
}

for dataset_name, config in datasets.items():

    print(f"\nValidating {dataset_name}")

    df = pd.read_sql(
        f"SELECT * FROM {config['table']}",
        engine
    )

    validation_results = config["validator"](df)

    passed = 0
    failed = 0

    for result in validation_results:

        if result.success:
            passed += 1
        else:
            failed += 1

            with engine.begin() as conn:

                conn.execute(
                    text("""
                    INSERT INTO quality_incidents
                    (
                        dataset_name,
                        issue_type,
                        issue_description,
                        severity
                    )
                    VALUES
                    (
                        :dataset,
                        'Validation Failure',
                        :description,
                        'HIGH'
                    )
                    """),
                    {
                        "dataset": dataset_name,
                        "description": str(result)
                    }
                )

    total_checks = passed + failed

    quality_score = (
        passed / total_checks
    ) * 100

    status = (
        "PASS"
        if failed == 0
        else "FAIL"
    )

    with engine.begin() as conn:

        conn.execute(
            text("""
            INSERT INTO data_quality_metrics
            (
                dataset_name,
                total_records,
                passed_expectations,
                failed_expectations,
                quality_score,
                validation_status
            )
            VALUES
            (
                :dataset,
                :records,
                :passed,
                :failed,
                :score,
                :status
            )
            """),
            {
                "dataset": dataset_name,
                "records": len(df),
                "passed": passed,
                "failed": failed,
                "score": round(
                    quality_score,
                    2
                ),
                "status": status
            }
        )

    print(
        f"{dataset_name} Score = "
        f"{quality_score:.2f}%"
    )

print("\nValidation Completed")