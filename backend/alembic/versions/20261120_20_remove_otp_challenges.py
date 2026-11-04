"""Remove OTP challenges after switching authentication to passwords."""

from alembic import op
import sqlalchemy as sa


revision = "20261120_20"
down_revision = "20261119_19"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("otp_challenges")


def downgrade():
    op.create_table(
        "otp_challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_send_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_otp_challenges_phone", "otp_challenges", ["phone"])
    op.create_index("ix_otp_challenges_phone_created", "otp_challenges", ["phone", "created_at"])
