from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    dataset_name: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    source_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    source_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    source_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    owner: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )