"""Add photo records for room listings."""

from alembic import op
import sqlalchemy as sa


revision = "20261104_04"
down_revision = "20261103_03"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "listing_id",
            sa.Integer(),
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_listing_images_listing_id", "listing_images", ["listing_id"])


def downgrade():
    op.drop_index("ix_listing_images_listing_id", table_name="listing_images")
    op.drop_table("listing_images")
