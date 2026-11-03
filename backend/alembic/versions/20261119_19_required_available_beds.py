"""Require the available bed count, matching the existing local database."""

from alembic import op
import sqlalchemy as sa


revision = "20261119_19"
down_revision = "20261118_18"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "listings",
        "available_beds",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade():
    op.alter_column(
        "listings",
        "available_beds",
        existing_type=sa.Integer(),
        nullable=True,
    )
