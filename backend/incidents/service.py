
from sqlalchemy import inspect, text
from backend.database.database import engine


def detect_incidents(dataset_name: str) -> dict:
    dataset_name = dataset_name.strip().lower()

    if not dataset_name:
        raise ValueError("dataset_name cannot be empty.")

    inspector = inspect(engine)

    required_tables = [
        "incidents",
        "data_quality_results",
        "dataset_freshness",
    ]

    missing = [
        table for table in required_tables
        if not inspector.has_table(table)
    ]

    if missing:
        raise ValueError(f"Missing tables: {missing}")

    incident_columns = {
        column["name"]
        for column in inspector.get_columns("incidents")
    }

    required_incident_columns = {
        "incident_code",
        "dataset_name",
        "incident_type",
        "severity",
        "description",
        "status",
        "created_at",
    }

    missing_columns = (
        required_incident_columns - incident_columns
    )

    if missing_columns:
        raise ValueError(
            "The incidents table is missing columns: "
            f"{sorted(missing_columns)}"
        )

    issues = []

    with engine.connect() as connection:
        # Use the latest result for each quality check.
        quality_rows = connection.execute(
            text("""
                SELECT check_type, status, details
                FROM (
                    SELECT DISTINCT ON (check_type)
                        check_type, status, details, checked_at
                    FROM data_quality_results
                    WHERE dataset_name = :dataset_name
                    ORDER BY check_type, checked_at DESC
                ) latest
                WHERE status = 'FAIL'
            """),
            {"dataset_name": dataset_name},
        ).mappings().all()

        freshness_rows = connection.execute(
            text("""
                SELECT freshness_status
                FROM dataset_freshness
                WHERE dataset_name = :dataset_name
                ORDER BY checked_at DESC
                LIMIT 1
            """),
            {"dataset_name": dataset_name},
        ).mappings().first()

    for row in quality_rows:
        issues.append({
            "incident_type": "DATA_QUALITY",
            "severity": "HIGH",
            "description": (
                f"Quality check '{row['check_type']}' failed "
                f"for dataset '{dataset_name}'. "
                f"Details: {row['details']}"
            ),
        })

    if freshness_rows:
        freshness_status = freshness_rows["freshness_status"]

        if freshness_status in {"STALE", "NEVER_UPDATED"}:
            issues.append({
                "incident_type": "DATA_FRESHNESS",
                "severity": (
                    "HIGH"
                    if freshness_status == "NEVER_UPDATED"
                    else "MEDIUM"
                ),
                "description": (
                    f"Dataset '{dataset_name}' freshness status "
                    f"is {freshness_status}."
                ),
            })

    created_incidents = []

    with engine.begin() as connection:
        for issue in issues:
            # Avoid creating duplicate open incidents for the
            # same dataset and incident type.
            existing = connection.execute(
                text("""
                    SELECT incident_code
                    FROM incidents
                    WHERE dataset_name = :dataset_name
                      AND incident_type = :incident_type
                      AND status = 'OPEN'
                    LIMIT 1
                """),
                {
                    "dataset_name": dataset_name,
                    "incident_type": issue["incident_type"],
                },
            ).first()

            if existing:
                continue

            incident_code = connection.execute(
                text("""
                    SELECT 'INC-' ||
                        upper(substr(
                            md5(
                                :dataset_name ||
                                :incident_type ||
                                clock_timestamp()::text
                            ),
                            1, 12
                        ))
                """),
                {
                    "dataset_name": dataset_name,
                    "incident_type": issue["incident_type"],
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
                        :incident_type,
                        :severity,
                        :description,
                        'OPEN',
                        CURRENT_TIMESTAMP
                    )
                """),
                {
                    "incident_code": incident_code,
                    "dataset_name": dataset_name,
                    **issue,
                },
            )

            created_incidents.append({
                "incident_code": incident_code,
                "dataset_name": dataset_name,
                **issue,
                "status": "OPEN",
            })

    return {
        "dataset_name": dataset_name,
        "issues_detected": len(issues),
        "incidents_created": len(created_incidents),
        "incidents": created_incidents,
    }
