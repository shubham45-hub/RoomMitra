"""Add user profile demographics and avatar URL."""

from alembic import op
import sqlalchemy as sa


revision = "20261113_13"
down_revision = "20261112_12"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("sex", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("religion", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("origin_state", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "origin_state")
    op.drop_column("users", "religion")
    op.drop_column("users", "sex")
