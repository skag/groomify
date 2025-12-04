"""add start_date to business_users

Revision ID: 9c69a8d889f7
Revises: 84811956461f
Create Date: 2025-12-03 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c69a8d889f7"
down_revision: Union[str, Sequence[str], None] = "84811956461f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add start_date column to business_users."""
    op.add_column(
        "business_users",
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove start_date column from business_users."""
    op.drop_column("business_users", "start_date")
