
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class FailurePrediction(Base):
    __tablename__ = "failure_predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    dataset_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )

    pipeline_run_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("pipeline_runs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    failure_probability: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    risk_level: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    predicted_failure: Mapped[bool] = mapped_column(
        Boolean, nullable=False
    )
    predicted_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
