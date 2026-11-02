"""Store one like or dislike per user and listing."""

from alembic import op
import sqlalchemy as sa


revision = "20261111_11"
down_revision = "20261110_10"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_reactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reaction", sa.String(length=10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("listing_id", "user_id", name="uq_listing_reaction_listing_user"),
    )
    op.create_index("ix_listing_reactions_listing", "listing_reactions", ["listing_id"])


def downgrade():
    op.drop_index("ix_listing_reactions_listing", table_name="listing_reactions")
    op.drop_table("listing_reactions")
