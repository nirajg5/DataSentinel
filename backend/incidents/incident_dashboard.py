import pandas as pd

from backend.ingestion.db_connection import get_engine

engine = get_engine()

summary = pd.read_sql(
    """
    SELECT

    status,

    COUNT(*) AS total

    FROM incidents

    GROUP BY status
    """,
    engine
)

severity = pd.read_sql(
    """
    SELECT

    severity,

    COUNT(*) AS total

    FROM incidents

    GROUP BY severity
    """,
    engine
)

print(
    "\n===== INCIDENT STATUS =====\n"
)

print(summary)

print(
    "\n===== SEVERITY =====\n"
)

print(severity)