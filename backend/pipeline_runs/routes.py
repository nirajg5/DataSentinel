
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.database.dependencies import get_db
from backend.llm.pipeline_summary import explain_pipeline_summary
from backend.models.failure_prediction import FailurePrediction
from backend.models.pipeline_run import PipelineRun

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pipeline-runs",
    tags=["Pipeline Runs"],
)

ALLOWED_STATUSES = {"STARTED", "SUCCESS", "FAILED"}


def serialize_run(run: PipelineRun, prediction=None) -> dict:
    return {
        "id": run.id,
        "run_id": run.run_id,
        "pipeline_name": run.pipeline_name,
        "dataset_name": run.dataset_name,
        "status": run.status,
        "source_file": run.source_file,
        "rows_read": run.rows_read,
        "rows_processed": run.rows_processed,
        "rows_loaded": run.rows_loaded,
        "execution_duration_seconds": run.execution_duration_seconds,
        "error_message": run.error_message,
        "started_at": (
            run.started_at.isoformat() if run.started_at else None
        ),
        "completed_at": (
            run.completed_at.isoformat() if run.completed_at else None
        ),
        "created_at": run.created_at.isoformat(),
        "prediction": (
            {
                "id": prediction.id,
                "failure_probability": prediction.failure_probability,
                "risk_level": prediction.risk_level,
                "predicted_failure": prediction.predicted_failure,
            }
            if prediction
            else None
        ),
    }


@router.get("")
def list_pipeline_runs(
    dataset_name: str | None = None,
    status: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    if status is not None:
        status = status.upper()
        if status not in ALLOWED_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Unsupported pipeline run status.",
            )

    query = db.query(PipelineRun)

    if dataset_name is not None:
        query = query.filter(PipelineRun.dataset_name == dataset_name)

    if status is not None:
        query = query.filter(PipelineRun.status == status)

    total = query.count()

    runs = (
        query.order_by(PipelineRun.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    run_ids = [run.id for run in runs]
    predictions_by_run = {}

    if run_ids:
        predictions = (
            db.query(FailurePrediction)
            .filter(FailurePrediction.pipeline_run_id.in_(run_ids))
            .order_by(FailurePrediction.id.desc())
            .all()
        )

        for prediction in predictions:
            predictions_by_run.setdefault(
                prediction.pipeline_run_id,
                prediction,
            )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            serialize_run(run, predictions_by_run.get(run.id))
            for run in runs
        ],
    }


@router.get("/summary")
def pipeline_runs_summary(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    total_runs = (
        db.query(func.count(PipelineRun.id)).scalar() or 0
    )

    completed_runs = (
        db.query(func.count(PipelineRun.id))
        .filter(PipelineRun.status.in_(["SUCCESS", "FAILED"]))
        .scalar()
        or 0
    )

    successful_runs = (
        db.query(func.count(PipelineRun.id))
        .filter(PipelineRun.status == "SUCCESS")
        .scalar()
        or 0
    )

    failed_runs = (
        db.query(func.count(PipelineRun.id))
        .filter(PipelineRun.status == "FAILED")
        .scalar()
        or 0
    )

    started_runs = (
        db.query(func.count(PipelineRun.id))
        .filter(PipelineRun.status == "STARTED")
        .scalar()
        or 0
    )

    average_duration = (
        db.query(func.avg(PipelineRun.execution_duration_seconds))
        .filter(
            PipelineRun.status.in_(["SUCCESS", "FAILED"]),
            PipelineRun.execution_duration_seconds.is_not(None),
        )
        .scalar()
    )

    recent_failures = (
        db.query(PipelineRun)
        .filter(PipelineRun.status == "FAILED")
        .order_by(
            PipelineRun.completed_at.desc(),
            PipelineRun.id.desc(),
        )
        .limit(10)
        .all()
    )

    summary = {
        "total_runs": total_runs,
        "completed_runs": completed_runs,
        "successful_runs": successful_runs,
        "failed_runs": failed_runs,
        "started_runs": started_runs,
        "success_rate_pct": (
            round(successful_runs / completed_runs * 100, 2)
            if completed_runs
            else None
        ),
        "failure_rate_pct": (
            round(failed_runs / completed_runs * 100, 2)
            if completed_runs
            else None
        ),
        "average_duration_seconds": (
            round(float(average_duration), 2)
            if average_duration is not None
            else None
        ),
        "recent_failures": [
            {
                "id": run.id,
                "run_id": run.run_id,
                "pipeline_name": run.pipeline_name,
                "dataset_name": run.dataset_name,
                "error_message": run.error_message,
                "completed_at": (
                    run.completed_at.isoformat()
                    if run.completed_at
                    else None
                ),
            }
            for run in recent_failures
        ],
    }

    # Groq is an optional enhancement. The metrics remain available
    # even if the LLM service fails unexpectedly.
    try:
        summary["llm_analysis"] = explain_pipeline_summary(summary)
    except Exception:
        logger.warning("Pipeline summary LLM analysis failed.")
        summary["llm_analysis"] = None

    return summary


@router.get("/{run_id}")
def get_pipeline_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    run = db.get(PipelineRun, run_id)

    if run is None:
        raise HTTPException(
            status_code=404,
            detail="Pipeline run not found.",
        )

    prediction = (
        db.query(FailurePrediction)
        .filter(FailurePrediction.pipeline_run_id == run.id)
        .order_by(FailurePrediction.id.desc())
        .first()
    )

    return serialize_run(run, prediction)