from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    pipeline_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    dataset_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    run_id: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    source_file: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    rows_read: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    rows_processed: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    rows_loaded: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    execution_duration_seconds: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )