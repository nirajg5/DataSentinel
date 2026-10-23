
import json
import logging
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from backend.agents.job_recovery import recover_stale_investigations

from backend.auth.constants import ADMIN, DATA_ENGINEER
from backend.auth.dependencies import require_role
from backend.agents.graph import investigate
from backend.database.database import SessionLocal
from backend.models.investigation_job import InvestigationJob
from backend.tasks.investigation_tasks import run_investigation_task
from backend.tasks.schemas import AsyncInvestigationRequest
from backend.agents.metrics import get_investigation_metrics

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/agent",
    tags=["Agentic Investigation"],
)


def utc_now():
    return datetime.now(timezone.utc)


class InvestigationRequest(BaseModel):
    question: str = Field(min_length=5, max_length=2000)

@router.post("/investigate")
def run_sync_investigation(
    payload: InvestigationRequest,
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    if not payload.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty.",
        )

    try:
        return investigate(payload.question)
    except Exception as exc:
        logger.exception("Synchronous investigation failed")
        raise HTTPException(
            status_code=502,
            detail="Investigation failed. Check application logs.",
        ) from exc


@router.post("/investigate/async", status_code=202)
def submit_async_investigation(
    payload: AsyncInvestigationRequest,
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    task_id = str(uuid4())

    # Persist the job before sending it to Celery.
    try:
        with SessionLocal() as db:
            job = InvestigationJob(
                task_id=task_id,
                user_id=current_user.id,
                question=payload.question,
                status="PENDING",
                created_at=utc_now(),
            )
            db.add(job)
            db.commit()
    except SQLAlchemyError as exc:
        logger.exception("Could not create investigation job")
        raise HTTPException(
            status_code=503,
            detail="Could not save the investigation job.",
        ) from exc

    # Use the same ID in PostgreSQL and Celery.
    try:
        run_investigation_task.apply_async(
            args=[payload.question, current_user.id],
            task_id=task_id,
        )
    except Exception as exc:
        logger.exception("Could not queue investigation %s", task_id)

        try:
            with SessionLocal() as db:
                job = (
                    db.query(InvestigationJob)
                    .filter(InvestigationJob.task_id == task_id)
                    .first()
                )
                if job is not None:
                    job.status = "FAILURE"
                    job.error_message = "Could not queue the investigation."
                    job.completed_at = utc_now()
                    db.commit()
        except SQLAlchemyError:
            logger.exception(
                "Could not record queue failure for %s", task_id
            )

        raise HTTPException(
            status_code=503,
            detail="Investigation could not be queued.",
        ) from exc

    return {
        "message": "Investigation submitted successfully",
        "task_id": task_id,
        "status": "PENDING",
    }


@router.get("/tasks/{task_id}")
def get_investigation_task_status(
    task_id: str,
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    # PostgreSQL is the source of truth for ownership and status.
    try:
        with SessionLocal() as db:
            job = (
                db.query(InvestigationJob)
                .filter(InvestigationJob.task_id == task_id)
                .first()
            )

            if job is None:
                raise HTTPException(
                    status_code=404,
                    detail="Investigation job not found.",
                )

            if job.user_id != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="You cannot access this investigation.",
                )

            response = {
                "task_id": job.task_id,
                "question": job.question,
                "status": job.status,
                "created_at": job.created_at.isoformat()
                if job.created_at else None,
                "started_at": job.started_at.isoformat()
                if job.started_at else None,
                "completed_at": job.completed_at.isoformat()
                if job.completed_at else None,
            }

            if job.status == "SUCCESS" and job.result_json:
                response["result"] = json.loads(job.result_json)

            if job.status == "FAILURE":
                response["error"] = (
                    job.error_message or "Investigation failed."
                )

            return response

    except HTTPException:
        raise
    except (SQLAlchemyError, ValueError) as exc:
        logger.exception("Could not retrieve investigation %s", task_id)
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve investigation status.",
        ) from exc




@router.get("/history")
def get_investigation_history(
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(default=None),
    dataset_name: str | None = Query(default=None, min_length=1, max_length=100),
    current_user=Depends(require_role(ADMIN, DATA_ENGINEER)),
):
    try:
        with SessionLocal() as db:
            query = db.query(InvestigationJob).filter(
                InvestigationJob.user_id == current_user.id
            )

            if status is not None:
                status = status.strip().upper()
                allowed_statuses = {
                    "PENDING",
                    "STARTED",
                    "SUCCESS",
                    "FAILURE",
                }

                if status not in allowed_statuses:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "Invalid status. Use PENDING, STARTED, "
                            "SUCCESS, or FAILURE."
                        ),
                    )

                query = query.filter(InvestigationJob.status == status)

            if dataset_name is not None:
                dataset_name = dataset_name.strip().lower()

                if not dataset_name:
                    raise HTTPException(
                        status_code=400,
                        detail="Dataset name cannot be empty.",
                    )

                # Match the dataset name mentioned in the investigation question.
                query = query.filter(
                    InvestigationJob.question.ilike(
                        f"%{dataset_name}%"
                    )
                )

            total = query.count()

            jobs = (
                query.order_by(
                    InvestigationJob.created_at.desc(),
                    InvestigationJob.id.desc(),
                )
                .offset(offset)
                .limit(limit)
                .all()
            )

            return {
                "total": total,
                "limit": limit,
                "offset": offset,
                "filters": {
                    "status": status,
                    "dataset_name": dataset_name,
                },
                "items": [
                    {
                        "task_id": job.task_id,
                        "question": job.question,
                        "status": job.status,
                        "created_at": (
                            job.created_at.isoformat()
                            if job.created_at else None
                        ),
                        "started_at": (
                            job.started_at.isoformat()
                            if job.started_at else None
                        ),
                        "completed_at": (
                            job.completed_at.isoformat()
                            if job.completed_at else None
                        ),
                        "error": (
                            job.error_message
                            if job.status == "FAILURE"
                            else None
                        ),
                    }
                    for job in jobs
                ],
            }

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        logger.exception("Could not retrieve investigation history")
        raise HTTPException(
            status_code=503,
            detail="Could not retrieve investigation history.",
        ) from exc


@router.post("/maintenance/recover-stale")
def recover_stale_jobs(
    timeout_minutes: int = Query(default=30, ge=1, le=1440),
    current_user=Depends(require_role(ADMIN)),
):
    try:
        return recover_stale_investigations(timeout_minutes)
    except Exception as exc:
        logger.exception("Stale investigation recovery failed")
        raise HTTPException(
            status_code=500,
            detail="Could not recover stale investigations.",
        ) from exc



@router.get("/metrics")
def investigation_metrics(
    current_user=Depends(require_role(ADMIN)),
):
    try:
        return get_investigation_metrics()
    except Exception as exc:
        logger.exception("Could not calculate investigation metrics")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve investigation metrics.",
        ) from exc


