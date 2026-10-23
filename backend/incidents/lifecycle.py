
from sqlalchemy import inspect, text

from backend.database.database import engine


def list_incidents(status: str | None = None) -> list:
    if not inspect(engine).has_table("incidents"):
        raise ValueError("incidents table does not exist.")

    query = """
        SELECT incident_code, dataset_name, incident_type,
               severity, description, status, created_at
        FROM incidents
    """
    params = {}

    if status:
        status = status.strip().upper()

        if status not in {"OPEN", "RESOLVED"}:
            raise ValueError("status must be OPEN or RESOLVED.")

        query += " WHERE status = :status"
        params["status"] = status

    query += " ORDER BY created_at DESC"

    with engine.connect() as connection:
        rows = connection.execute(
            text(query), params
        ).mappings().all()

    return [dict(row) for row in rows]


def resolve_incident(incident_code: str) -> dict:
    inspector = inspect(engine)

    if not inspector.has_table("incidents"):
        raise ValueError("incidents table does not exist.")

    columns = {
        column["name"]
        for column in inspector.get_columns("incidents")
    }

    if "resolved_at" not in columns:
        raise ValueError(
            "The incidents table has no resolved_at column. "
            "Check your Incident model before adding this feature."
        )

    with engine.begin() as connection:
        result = connection.execute(
            text("""
                UPDATE incidents
                SET status = 'RESOLVED',
                    resolved_at = CURRENT_TIMESTAMP
                WHERE incident_code = :incident_code
                  AND status = 'OPEN'
                RETURNING incident_code, dataset_name,
                          incident_type, severity, status,
                          resolved_at
            """),
            {"incident_code": incident_code},
        ).mappings().first()

    if result is None:
        raise ValueError(
            "Incident not found or it is already resolved."
        )

    return dict(result)
