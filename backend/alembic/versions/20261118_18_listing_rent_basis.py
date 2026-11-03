"""Record whether listing rent is per person or for the whole flat."""

from alembic import op
import sqlalchemy as sa


revision = "20261118_18"
down_revision = "20261117_17"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "listings",
        sa.Column("rent_basis", sa.String(length=20), server_default="PER_PERSON", nullable=False),
    )


def downgrade():
    op.drop_column("listings", "rent_basis")
