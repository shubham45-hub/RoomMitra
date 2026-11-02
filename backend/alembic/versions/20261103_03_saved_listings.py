"""Add saved listings."""

from alembic import op
import sqlalchemy as sa

revision = "20261103_03"
down_revision = "20261102_02"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "saved_listings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "listing_id",
            sa.Integer(),
            sa.ForeignKey("listings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "user_id",
            "listing_id",
            name="uq_saved_listing_user_listing",
        ),
    )
    op.create_index("ix_saved_listings_user_id", "saved_listings", ["user_id"])


def downgrade():
    op.drop_index("ix_saved_listings_user_id", table_name="saved_listings")
    op.drop_table("saved_listings")