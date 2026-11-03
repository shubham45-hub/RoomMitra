"""Add three-state furnishing status to listings."""

from alembic import op
import sqlalchemy as sa


revision = "20261114_14"
down_revision = "20261113_13"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("listings", sa.Column("furnishing_status", sa.String(length=20), nullable=True))
    op.execute(
        "UPDATE listings SET furnishing_status = CASE "
        "WHEN is_furnished IS TRUE THEN 'FURNISHED' ELSE 'UNFURNISHED' END"
    )
    op.alter_column(
        "listings",
        "furnishing_status",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="UNFURNISHED",
    )


def downgrade():
    op.drop_column("listings", "furnishing_status")
