
from datetime import datetime, timezone

from sqlalchemy import case, func

from backend.database.database import SessionLocal
from backend.models.investigation_job import InvestigationJob


def get_investigation_metrics():
    """Return aggregate investigation metrics from PostgreSQL."""
    with SessionLocal() as db:
        row = (
            db.query(
                func.count(InvestigationJob.id).label("total"),
                func.sum(
                    case(
                        (InvestigationJob.status == "SUCCESS", 1),
                        else_=0,
                    )
                ).label("successful"),
                func.sum(
                    case(
                        (InvestigationJob.status == "FAILURE", 1),
                        else_=0,
                    )
                ).label("failed"),
                func.sum(
                    case(
                        (
                            InvestigationJob.status.in_(
                                ["PENDING", "STARTED"]
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ).label("in_progress"),
                func.avg(
                    func.extract(
                        "epoch",
                        InvestigationJob.completed_at
                        - InvestigationJob.started_at,
                    )
                )
                .filter(
                    InvestigationJob.started_at.isnot(None),
                    InvestigationJob.completed_at.isnot(None),
                )
                .label("average_duration_seconds"),
            )
            .one()
        )

        total = int(row.total or 0)
        successful = int(row.successful or 0)
        failed = int(row.failed or 0)

        return {
            "total_investigations": total,
            "successful": successful,
            "failed": failed,
            "in_progress": int(row.in_progress or 0),
            "success_rate_percent": round(
                successful / total * 100, 2
            ) if total else 0.0,
            "average_duration_seconds": round(
                float(row.average_duration_seconds), 2
            ) if row.average_duration_seconds is not None else None,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
