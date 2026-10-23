
import logging
from datetime import datetime, timedelta, timezone

from backend.database.database import SessionLocal
from backend.models.investigation_job import InvestigationJob

logger = logging.getLogger(__name__)


def recover_stale_investigations(timeout_minutes: int = 30) -> dict:
    """Mark investigations that exceeded their runtime as failed."""
    if timeout_minutes < 1:
        raise ValueError("timeout_minutes must be at least 1.")

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=timeout_minutes)

    recovered = 0

    with SessionLocal() as db:
        jobs = (
            db.query(InvestigationJob)
            .filter(
                InvestigationJob.status == "STARTED",
                InvestigationJob.started_at.isnot(None),
                InvestigationJob.started_at < cutoff,
            )
            .all()
        )

        for job in jobs:
            job.status = "FAILURE"
            job.error_message = (
                "Investigation exceeded its allowed runtime. "
                "Check the Celery worker logs before retrying."
            )
            job.completed_at = now
            recovered += 1

        db.commit()

    logger.info("Recovered %s stale investigation jobs", recovered)

    return {
        "checked_at": now.isoformat(),
        "timeout_minutes": timeout_minutes,
        "recovered_count": recovered,
    }
