from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class ReliabilityScore(Base):
    __tablename__ = "reliability_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataset_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    reliability_score: Mapped[float] = mapped_column(
        Float, nullable=False
    )
    reliability_status: Mapped[str] = mapped_column(
        String(30), nullable=False
    )
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )