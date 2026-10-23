from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class DatasetFreshness(Base):
    __tablename__ = "dataset_freshness"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    expected_update_time: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    actual_update_time: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    freshness_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    freshness_score: Mapped[float] = mapped_column(
        Float, nullable=False, default=100
    )
    checked_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )