"""Add short-lived password reset challenges."""

from alembic import op
import sqlalchemy as sa


revision = "20261121_21"
down_revision = "20261120_20"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("password_version", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_table(
        "password_reset_challenges",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("next_send_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_password_reset_challenges_phone", "password_reset_challenges", ["phone"])
    op.create_index(
        "ix_password_reset_challenges_phone_created",
        "password_reset_challenges",
        ["phone", "created_at"],
    )


def downgrade():
    op.drop_index("ix_password_reset_challenges_phone_created", table_name="password_reset_challenges")
    op.drop_index("ix_password_reset_challenges_phone", table_name="password_reset_challenges")
    op.drop_table("password_reset_challenges")
    op.drop_column("users", "password_version")
