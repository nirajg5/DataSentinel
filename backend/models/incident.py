from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    incident_code: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    dataset_name: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    incident_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    severity: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="OPEN"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )