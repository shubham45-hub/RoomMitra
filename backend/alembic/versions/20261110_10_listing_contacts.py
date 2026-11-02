"""Count unique people who contacted each listing."""

from alembic import op
import sqlalchemy as sa


revision = "20261110_10"
down_revision = "20261109_09"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("first_contacted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_contacted_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("listing_id", "user_id", name="uq_listing_contact_listing_user"),
    )
    op.create_index("ix_listing_contacts_listing", "listing_contacts", ["listing_id"])
    op.execute(
        """
        INSERT INTO listing_contacts (listing_id, user_id, first_contacted_at, last_contacted_at)
        SELECT listing_id, sender_id, MIN(created_at), MAX(created_at)
        FROM listing_inquiries
        GROUP BY listing_id, sender_id
        ON CONFLICT (listing_id, user_id) DO NOTHING
        """
    )


def downgrade():
    op.drop_index("ix_listing_contacts_listing", table_name="listing_contacts")
    op.drop_table("listing_contacts")
