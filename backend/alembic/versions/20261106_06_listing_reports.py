"""Add listing reports and moderation review metadata."""

from alembic import op
import sqlalchemy as sa


revision = "20261106_06"
down_revision = "20261105_05"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "listing_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("listing_id", sa.Integer(), sa.ForeignKey("listings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(length=40), nullable=False),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="OPEN", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_listing_reports_listing_id", "listing_reports", ["listing_id"])
    op.create_index("ix_listing_reports_reporter_id", "listing_reports", ["reporter_id"])
    op.create_index("ix_listing_reports_status_created", "listing_reports", ["status", "created_at"])


def downgrade():
    op.drop_index("ix_listing_reports_status_created", table_name="listing_reports")
    op.drop_index("ix_listing_reports_reporter_id", table_name="listing_reports")
    op.drop_index("ix_listing_reports_listing_id", table_name="listing_reports")
    op.drop_table("listing_reports")
