from sqlalchemy import text

from backend.ingestion.db_connection import get_engine

engine = get_engine()

incident_id = int(
    input(
        "Enter Incident ID: "
    )
)

with engine.begin() as conn:

    old_status_query = conn.execute(
        text("""
        SELECT status
        FROM incidents
        WHERE incident_id=:id
        """),
        {
            "id": incident_id
        }
    )

    old_status = (
        old_status_query.fetchone()[0]
    )

    conn.execute(
        text("""
        UPDATE incidents
        SET

        status='RESOLVED',

        resolved_at=CURRENT_TIMESTAMP

        WHERE incident_id=:id
        """),
        {
            "id": incident_id
        }
    )

    conn.execute(
        text("""
        INSERT INTO incident_audit
        (
            incident_id,
            old_status,
            new_status
        )
        VALUES
        (
            :id,
            :old,
            'RESOLVED'
        )
        """),
        {
            "id": incident_id,
            "old": old_status
        }
    )

print(
    "Incident Resolved"
)