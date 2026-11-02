"""Store a user's preferred city for home search."""

from alembic import op
import sqlalchemy as sa


revision = "20261112_12"
down_revision = "20261111_11"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("preferred_city", sa.String(length=100), nullable=True))


def downgrade():
    op.drop_column("users", "preferred_city")
