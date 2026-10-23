
"""link failure predictions to pipeline runs

Revision ID: cf95f543b0ad
Revises: 0f20b18dc935
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "cf95f543b0ad"
down_revision: Union[str, Sequence[str], None] = "0f20b18dc935"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "failure_predictions",
        sa.Column("pipeline_run_id", sa.Integer(), nullable=True),
    )

    op.create_index(
        "ix_failure_predictions_pipeline_run_id",
        "failure_predictions",
        ["pipeline_run_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_failure_predictions_pipeline_run_id_pipeline_runs",
        "failure_predictions",
        "pipeline_runs",
        ["pipeline_run_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_failure_predictions_pipeline_run_id_pipeline_runs",
        "failure_predictions",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_failure_predictions_pipeline_run_id",
        table_name="failure_predictions",
    )

    op.drop_column("failure_predictions", "pipeline_run_id")
