
"""add investigation jobs

Revision ID: 0f20b18dc935
Revises: 318c4f4613a7
Create Date: 2026-10-18 16:46:06.968267
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0f20b18dc935"
down_revision: Union[str, Sequence[str], None] = "318c4f4613a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the investigation jobs table."""

    op.create_table(
        "investigation_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("result_json", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_investigation_jobs_id",
        "investigation_jobs",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_investigation_jobs_status",
        "investigation_jobs",
        ["status"],
        unique=False,
    )
    op.create_index(
        "ix_investigation_jobs_task_id",
        "investigation_jobs",
        ["task_id"],
        unique=True,
    )
    op.create_index(
        "ix_investigation_jobs_user_created",
        "investigation_jobs",
        ["user_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_investigation_jobs_user_id",
        "investigation_jobs",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove the investigation jobs table."""

    op.drop_index(
        "ix_investigation_jobs_user_id",
        table_name="investigation_jobs",
    )
    op.drop_index(
        "ix_investigation_jobs_user_created",
        table_name="investigation_jobs",
    )
    op.drop_index(
        "ix_investigation_jobs_task_id",
        table_name="investigation_jobs",
    )
    op.drop_index(
        "ix_investigation_jobs_status",
        table_name="investigation_jobs",
    )
    op.drop_index(
        "ix_investigation_jobs_id",
        table_name="investigation_jobs",
    )
    op.drop_table("investigation_jobs")
