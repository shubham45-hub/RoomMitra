"""Add expiry dates to listings; preserve existing listings with a 30-day period."""

from alembic import op
import sqlalchemy as sa


revision = "20261107_07"
down_revision = "20261106_06"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("listings", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    op.execute(
        "UPDATE listings SET expires_at = COALESCE(created_at, now()) + INTERVAL '30 days' "
        "WHERE expires_at IS NULL"
    )
    op.alter_column("listings", "expires_at", nullable=False)


def downgrade():
    op.drop_column("listings", "expires_at")
