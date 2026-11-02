"""Track which listing inquiries have been opened by their owner."""

from alembic import op
import sqlalchemy as sa


revision = "20261108_08"
down_revision = "20261107_07"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("listing_inquiries", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    # Do not turn old inquiries into a flood of new notifications after upgrade.
    op.execute("UPDATE listing_inquiries SET read_at = created_at WHERE read_at IS NULL")
    op.create_index(
        "ix_listing_inquiries_owner_read",
        "listing_inquiries",
        ["owner_id", "read_at"],
    )


def downgrade():
    op.drop_index("ix_listing_inquiries_owner_read", table_name="listing_inquiries")
    op.drop_column("listing_inquiries", "read_at")
