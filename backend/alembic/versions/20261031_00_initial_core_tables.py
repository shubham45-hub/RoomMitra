"""Create the original user and listing tables for fresh databases.

The first RoomMitra migrations were written after local tables had already been
created with SQLAlchemy. This baseline lets a clean Neon database follow the
same Alembic history without using create_all.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20261031_00"
down_revision = None
branch_labels = None
depends_on = None


listing_status = postgresql.ENUM(
    "DRAFT", "ACTIVE", "PAUSED", "FILLED", name="listing_status", create_type=False
)


def upgrade():
    bind = op.get_bind()
    listing_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_phone", "users", ["phone"], unique=True)

    op.create_table(
        "listings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("locality", sa.String(length=150), nullable=False),
        sa.Column("pincode", sa.String(length=10), nullable=True),
        sa.Column("flat_type", sa.String(length=20), nullable=False),
        sa.Column("available_beds", sa.Integer(), nullable=False),
        sa.Column("monthly_rent", sa.Integer(), nullable=False),
        sa.Column("security_deposit", sa.Integer(), nullable=True),
        sa.Column("is_furnished", sa.Boolean(), nullable=True),
        sa.Column("brokerage", sa.Integer(), nullable=True),
        sa.Column("status", listing_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_listings_id", "listings", ["id"])


def downgrade():
    op.drop_index("ix_listings_id", table_name="listings")
    op.drop_table("listings")
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
    listing_status.drop(op.get_bind(), checkfirst=True)
