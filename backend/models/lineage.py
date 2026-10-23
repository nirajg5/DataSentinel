from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class DataLineage(Base):
    __tablename__ = "lineage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_dataset: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    target_dataset: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    relationship_type: Mapped[str] = mapped_column(
        String(100), nullable=False, default="UPSTREAM_TO_DOWNSTREAM"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )