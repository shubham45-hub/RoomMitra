"""Record who each listing is available for."""

from alembic import op
import sqlalchemy as sa


revision = "20261115_15"
down_revision = "20261114_14"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("listings", sa.Column("available_for", sa.String(length=20), nullable=True))
    op.execute(
        "UPDATE listings AS listing "
        "SET available_for = CASE "
        "WHEN UPPER(users.sex) = 'MALE' THEN 'MALE' "
        "WHEN UPPER(users.sex) = 'FEMALE' THEN 'FEMALE' "
        "ELSE 'ANY' END "
        "FROM users WHERE users.id = listing.user_id"
    )
    op.execute("UPDATE listings SET available_for = 'ANY' WHERE available_for IS NULL")
    op.alter_column(
        "listings",
        "available_for",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="ANY",
    )


def downgrade():
    op.drop_column("listings", "available_for")
