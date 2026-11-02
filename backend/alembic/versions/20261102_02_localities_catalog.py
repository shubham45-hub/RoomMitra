"""Add a local place catalogue for autocomplete."""

from alembic import op
import sqlalchemy as sa

revision = "20261102_02"
down_revision = "20261101_01"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "localities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column(
            "source",
            sa.String(length=40),
            server_default="OpenStreetMap",
            nullable=False,
        ),
        sa.UniqueConstraint("city", "name", name="uq_localities_city_name"),
    )
    op.create_index("ix_localities_city", "localities", ["city"])


def downgrade():
    op.drop_index("ix_localities_city", table_name="localities")
    op.drop_table("localities")