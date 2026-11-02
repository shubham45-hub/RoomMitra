"""Track the latest view from each user for every listing."""

from alembic import op
import sqlalchemy as sa


revision = "20261109_09"
down_revision = "20261108_08"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_views",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("viewer_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("listing_id", "viewer_id", name="uq_listing_view_listing_viewer"),
    )
    op.create_index(
        "ix_listing_views_listing_last_viewed",
        "listing_views",
        ["listing_id", "last_viewed_at"],
    )


def downgrade():
    op.drop_index("ix_listing_views_listing_last_viewed", table_name="listing_views")
    op.drop_table("listing_views")
