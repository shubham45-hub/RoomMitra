"""Categorize listing photos and support the larger gallery limit."""

from alembic import op
import sqlalchemy as sa


revision = "20261117_17"
down_revision = "20261116_16"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "listing_images",
        sa.Column("category", sa.String(length=20), server_default="OTHER", nullable=False),
    )


def downgrade():
    op.drop_column("listing_images", "category")
