
from sqlalchemy import inspect, text

from backend.database.database import engine


def detect_pipeline_failures(dataset_name: str) -> dict:
    dataset_name = dataset_name.strip().lower()

    if not dataset_name:
        raise ValueError("dataset_name cannot be empty.")

    inspector = inspect(engine)

    if not inspector.has_table("pipeline_runs"):
        raise ValueError("pipeline_runs table does not exist.")

    if not inspector.has_table("incidents"):
        raise ValueError("incidents table does not exist.")

    pipeline_columns = {
        column["name"]
        for column in inspector.get_columns("pipeline_runs")
    }

    required_pipeline_columns = {
        "dataset_name",
        "run_id",
        "status",
        "error_message",
    }

    missing = required_pipeline_columns - pipeline_columns

    if missing:
        raise ValueError(
            f"pipeline_runs is missing columns: {sorted(missing)}"
        )

    with engine.connect() as connection:
        failed_runs = connection.execute(
            text("""
                SELECT run_id, status, error_message
                FROM pipeline_runs
                WHERE dataset_name = :dataset_name
                  AND status = 'FAILED'
                ORDER BY created_at DESC
                LIMIT 20
            """),
            {"dataset_name": dataset_name},
        ).mappings().all()

    created_incidents = []

    with engine.begin() as connection:
        for run in failed_runs:
            run_id = str(run["run_id"])
            description = (
                f"Pipeline run {run_id} failed for dataset "
                f"{dataset_name}. Error: "
                f"{run['error_message'] or 'No error message recorded'}"
            )

            existing = connection.execute(
                text("""
                    SELECT incident_code
                    FROM incidents
                    WHERE dataset_name = :dataset_name
                      AND incident_type = 'PIPELINE_FAILURE'
                      AND status = 'OPEN'
                      AND description LIKE :run_pattern
                    LIMIT 1
                """),
                {
                    "dataset_name": dataset_name,
                    "run_pattern": f"%{run_id}%",
                },
            ).first()

            if existing:
                continue

            incident_code = connection.execute(
                text("""
                    SELECT 'INC-' ||
                        upper(substr(md5(
                            :dataset_name || :run_id ||
                            clock_timestamp()::text
                        ), 1, 12))
                """),
                {
                    "dataset_name": dataset_name,
                    "run_id": run_id,
                },
            ).scalar_one()

            connection.execute(
                text("""
                    INSERT INTO incidents (
                        incident_code,
                        dataset_name,
                        incident_type,
                        severity,
                        description,
                        status,
                        created_at
                    )
                    VALUES (
                        :incident_code,
                        :dataset_name,
                        'PIPELINE_FAILURE',
                        'HIGH',
                        :description,
                        'OPEN',
                        CURRENT_TIMESTAMP
                    )
                """),
                {
                    "incident_code": incident_code,
                    "dataset_name": dataset_name,
                    "description": description,
                },
            )

            created_incidents.append({
                "incident_code": incident_code,
                "dataset_name": dataset_name,
                "run_id": run_id,
                "incident_type": "PIPELINE_FAILURE",
                "severity": "HIGH",
                "status": "OPEN",
            })

    return {
        "dataset_name": dataset_name,
        "failed_runs_found": len(failed_runs),
        "incidents_created": len(created_incidents),
        "incidents": created_incidents,
    }
