
import logging

from prometheus_client import Gauge
from sqlalchemy import case, func

from backend.database.database import SessionLocal
from backend.models.investigation_job import InvestigationJob

logger = logging.getLogger(__name__)

INVESTIGATION_JOBS = Gauge(
    "datasentinel_investigation_jobs",
    "Number of investigation jobs by current status",
    ["status"],
)

INVESTIGATION_SUCCESS_RATE = Gauge(
    "datasentinel_investigation_success_rate_percent",
    "Percentage of all recorded investigation jobs currently successful",
)

INVESTIGATION_AVERAGE_DURATION = Gauge(
    "datasentinel_investigation_average_duration_seconds",
    "Average duration in seconds of completed investigation jobs",
)

STATUSES = ["PENDING", "STARTED", "SUCCESS", "FAILURE"]


def refresh_investigation_metrics():
    """Refresh Prometheus gauges from persisted PostgreSQL jobs."""
    with SessionLocal() as db:
        counts = dict(
            db.query(
                InvestigationJob.status,
                func.count(InvestigationJob.id),
            )
            .group_by(InvestigationJob.status)
            .all()
        )

        for status in STATUSES:
            INVESTIGATION_JOBS.labels(status=status).set(
                counts.get(status, 0)
            )

        total = sum(counts.values())
        successful = counts.get("SUCCESS", 0)

        success_rate = (
            successful / total * 100
            if total
            else 0.0
        )
        INVESTIGATION_SUCCESS_RATE.set(success_rate)

        average_duration = (
            db.query(
                func.avg(
                    func.extract(
                        "epoch",
                        InvestigationJob.completed_at
                        - InvestigationJob.started_at,
                    )
                )
            )
            .filter(
                InvestigationJob.started_at.isnot(None),
                InvestigationJob.completed_at.isnot(None),
            )
            .scalar()
        )

        INVESTIGATION_AVERAGE_DURATION.set(
            float(average_duration)
            if average_duration is not None
            else 0.0
        )
