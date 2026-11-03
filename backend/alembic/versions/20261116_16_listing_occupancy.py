"""Track current residents for each listing."""

from alembic import op
import sqlalchemy as sa


revision = "20261116_16"
down_revision = "20261115_15"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "listings",
        sa.Column("occupants_count", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade():
    op.drop_column("listings", "occupants_count")
