from datetime import datetime, timezone

from sqlalchemy.orm import Session

from backend.models.pipeline_run import PipelineRun


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def create_pipeline_run(
    db: Session,
    pipeline_name: str,
    dataset_name: str,
    run_id: str,
    source_file: str,
    rows_read: int,
) -> PipelineRun:
    run = PipelineRun(
        pipeline_name=pipeline_name,
        dataset_name=dataset_name,
        run_id=run_id,
        status="STARTED",
        source_file=source_file,
        rows_read=rows_read,
        rows_processed=0,
        rows_loaded=0,
        started_at=utc_now(),
    )

    try:
        db.add(run)
        db.commit()
        db.refresh(run)
        return run
    except Exception:
        db.rollback()
        raise


def finish_pipeline_run(
    db: Session,
    run: PipelineRun,
    status: str,
    rows_processed: int = 0,
    rows_loaded: int = 0,
    error_message: str | None = None,
) -> None:
    completed_at = utc_now()

    run.status = status
    run.rows_processed = rows_processed
    run.rows_loaded = rows_loaded
    run.error_message = error_message
    run.completed_at = completed_at

    if run.started_at:
        run.execution_duration_seconds = max(
            0.0,
            (completed_at - run.started_at).total_seconds(),
        )

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise