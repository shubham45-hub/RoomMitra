"""Add messages sent by people interested in a listing."""

from alembic import op
import sqlalchemy as sa


revision = "20261105_05"
down_revision = "20261104_04"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_inquiries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "listing_id",
            sa.Integer(),
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "owner_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("phone_shared", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_listing_inquiries_listing_id", "listing_inquiries", ["listing_id"])
    op.create_index("ix_listing_inquiries_sender_id", "listing_inquiries", ["sender_id"])
    op.create_index("ix_listing_inquiries_owner_id", "listing_inquiries", ["owner_id"])


def downgrade():
    op.drop_index("ix_listing_inquiries_owner_id", table_name="listing_inquiries")
    op.drop_index("ix_listing_inquiries_sender_id", table_name="listing_inquiries")
    op.drop_index("ix_listing_inquiries_listing_id", table_name="listing_inquiries")
    op.drop_table("listing_inquiries")
