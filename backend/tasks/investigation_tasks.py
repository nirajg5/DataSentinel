
import json
import logging
from datetime import datetime, timezone

from backend.database.database import SessionLocal
from backend.models.investigation_job import InvestigationJob
from backend.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def utc_now():
    return datetime.now(timezone.utc)


@celery_app.task(
    name="datasentinel.investigate",
    bind=True,
    max_retries=2,
    default_retry_delay=5,
    soft_time_limit=300,
    time_limit=330,
)
def run_investigation_task(self, question: str, user_id: int):
    task_id = self.request.id
    started_at = utc_now()

    # Claim only a job that has not already been started or recovered.
    with SessionLocal() as db:
        claimed = (
            db.query(InvestigationJob)
            .filter(
                InvestigationJob.task_id == task_id,
                InvestigationJob.user_id == user_id,
                InvestigationJob.status == "PENDING",
            )
            .update(
                {
                    InvestigationJob.status: "STARTED",
                    InvestigationJob.started_at: started_at,
                    InvestigationJob.error_message: None,
                },
                synchronize_session=False,
            )
        )
        db.commit()

    if claimed != 1:
        logger.warning(
            "Task %s was not claimed; it may already be running or finished.",
            task_id,
        )
        return {"status": "IGNORED", "task_id": task_id}

    try:
        from backend.agents.graph import investigate

        result = investigate(question)
        result_json = json.dumps(result, default=str)
        completed_at = utc_now()

        # Update only if recovery has not already changed the status.
        with SessionLocal() as db:
            updated = (
                db.query(InvestigationJob)
                .filter(
                    InvestigationJob.task_id == task_id,
                    InvestigationJob.user_id == user_id,
                    InvestigationJob.status == "STARTED",
                )
                .update(
                    {
                        InvestigationJob.status: "SUCCESS",
                        InvestigationJob.result_json: result_json,
                        InvestigationJob.error_message: None,
                        InvestigationJob.completed_at: completed_at,
                    },
                    synchronize_session=False,
                )
            )
            db.commit()

        if updated != 1:
            logger.warning(
                "Task %s finished, but its database status had changed.",
                task_id,
            )
            return {"status": "STALE_RESULT_DISCARDED", "task_id": task_id}

        return result


    except Exception as exc:
        logger.exception("Investigation attempt failed: %s", task_id)

        retries_remaining = self.request.retries < self.max_retries

        try:
            with SessionLocal() as db:
                query = db.query(InvestigationJob).filter(
                    InvestigationJob.task_id == task_id,
                    InvestigationJob.user_id == user_id,
                    InvestigationJob.status == "STARTED",
                )

                if retries_remaining:
                    # Return the job to PENDING before Celery retries it.
                    query.update(
                        {
                            InvestigationJob.status: "PENDING",
                            InvestigationJob.started_at: None,
                            InvestigationJob.completed_at: None,
                            InvestigationJob.error_message:
                                "Transient failure; retry scheduled.",
                        },
                        synchronize_session=False,
                    )
                else:
                    query.update(
                        {
                            InvestigationJob.status: "FAILURE",
                            InvestigationJob.error_message:
                                "Investigation failed after retries. "
                                "Check worker logs.",
                            InvestigationJob.completed_at: utc_now(),
                        },
                        synchronize_session=False,
                    )

                db.commit()

        except Exception:
            logger.exception(
                "Could not persist failure or retry state for %s",
                task_id,
            )
            raise

        if retries_remaining:
            raise self.retry(exc=exc, countdown=5)

        raise
