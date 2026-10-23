
from sqlalchemy import inspect, text

from backend.database.database import engine


DATASETS = ["customers", "products", "orders"]

QUALITY_WEIGHT = 0.50
FRESHNESS_WEIGHT = 0.30
PIPELINE_WEIGHT = 0.20


def calculate_reliability(dataset_type: str) -> dict:
    dataset_type = dataset_type.strip().lower()

    if dataset_type not in DATASETS:
        raise ValueError(
            f"Unsupported dataset: {dataset_type}. "
            f"Supported datasets: {DATASETS}"
        )

    dataset_name = f"bronze_{dataset_type}"
    inspector = inspect(engine)

    required_tables = [
        "data_quality_results",
        "dataset_freshness",
        "pipeline_runs",
        "reliability_scores",
    ]

    missing_tables = [
        table for table in required_tables
        if not inspector.has_table(table)
    ]
    if missing_tables:
        raise ValueError(f"Missing required tables: {missing_tables}")

    freshness_columns = {
        c["name"] for c in inspector.get_columns("dataset_freshness")
    }
    quality_columns = {
        c["name"] for c in inspector.get_columns("data_quality_results")
    }
    reliability_columns = {
        c["name"] for c in inspector.get_columns("reliability_scores")
    }

    freshness_score_column = next(
        (name for name in ("freshness_score", "score")
         if name in freshness_columns),
        None,
    )

    if not freshness_score_column:
        raise ValueError(
            "Could not find a score column in dataset_freshness."
        )

    if "score" not in quality_columns:
        raise ValueError(
            "Could not find the score column in data_quality_results."
        )

    required_reliability_columns = {
        "dataset_name", "reliability_score", "reliability_status"
    }
    if not required_reliability_columns.issubset(reliability_columns):
        raise ValueError(
            "reliability_scores is missing required columns."
        )

    with engine.begin() as connection:
        quality_score = connection.execute(
            text("""
                SELECT AVG(score)
                FROM (
                    SELECT DISTINCT ON (check_type)
                        check_type, score, checked_at
                    FROM data_quality_results
                    WHERE dataset_name = :dataset_name
                    ORDER BY check_type, checked_at DESC
                ) AS latest_checks
            """),
            {"dataset_name": dataset_type},
        ).scalar()

        freshness_score = connection.execute(
            text(f"""
                SELECT "{freshness_score_column}"
                FROM dataset_freshness
                WHERE dataset_name = :dataset_name
                ORDER BY checked_at DESC
                LIMIT 1
            """),
            {"dataset_name": dataset_name},
        ).scalar()

        pipeline_stats = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_runs,
                    COUNT(*) FILTER (
                        WHERE UPPER(status) = 'SUCCESS'
                    ) AS successful_runs
                FROM (
                    SELECT status, completed_at
                    FROM pipeline_runs
                    WHERE dataset_name = :dataset_name
                    ORDER BY completed_at DESC NULLS LAST
                    LIMIT 20
                ) AS recent_runs
            """),
            {"dataset_name": dataset_name},
        ).one()

        if quality_score is None:
            raise ValueError(
                f"No quality results found for {dataset_name}. "
                "Run the data quality checks first."
            )

        if freshness_score is None:
            raise ValueError(
                f"No freshness result found for {dataset_name}. "
                "Run the freshness check first."
            )

        total_runs = int(pipeline_stats.total_runs)
        successful_runs = int(pipeline_stats.successful_runs)

        if total_runs == 0:
            raise ValueError(
                f"No pipeline runs found for {dataset_name}. "
                "Run ingestion first."
            )

        quality_score = float(quality_score)
        freshness_score = float(freshness_score)
        pipeline_score = 100.0 * successful_runs / total_runs

        overall_score = round(
            QUALITY_WEIGHT * quality_score
            + FRESHNESS_WEIGHT * freshness_score
            + PIPELINE_WEIGHT * pipeline_score,
            2,
        )

        if overall_score >= 90:
            status = "HEALTHY"
        elif overall_score >= 70:
            status = "WARNING"
        else:
            status = "CRITICAL"

        result = connection.execute(
            text("""
INSERT INTO reliability_scores (
    dataset_name,
    reliability_score,
    reliability_status,
    calculated_at
)
VALUES (
    :dataset_name,
    :reliability_score,
    :reliability_status,
    CURRENT_TIMESTAMP
)
RETURNING id, calculated_at
            """),
            {
                "dataset_name": dataset_name,
                "reliability_score": overall_score,
                "reliability_status": status,
            },
        ).one()

    return {
        "dataset_name": dataset_name,
        "quality_score": round(quality_score, 2),
        "freshness_score": round(freshness_score, 2),
        "pipeline_score": round(pipeline_score, 2),
        "overall_score": overall_score,
        "status": status,
        "recent_pipeline_runs": total_runs,
        "successful_pipeline_runs": successful_runs,
        "persisted": True,
        "reliability_record_id": result.id,
        "calculated_at": result.calculated_at.isoformat(),
    }
