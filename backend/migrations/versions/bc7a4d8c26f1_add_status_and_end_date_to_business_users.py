"""add status and end_date to business_users

Revision ID: bc7a4d8c26f1
Revises: 9c69a8d889f7
Create Date: 2025-12-03 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "bc7a4d8c26f1"
down_revision: Union[str, Sequence[str], None] = "9c69a8d889f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define the enum separately so alembic can create/drop it
businessuserstatus = sa.Enum("active", "inactive", "terminated", name="businessuserstatus")


def upgrade() -> None:
    """Add status and end_date columns to business_users."""
    businessuserstatus.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "business_users",
        sa.Column("status", businessuserstatus, nullable=False, server_default="active"),
    )
    op.add_column(
        "business_users",
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove status and end_date columns from business_users."""
    op.drop_column("business_users", "end_date")
    op.drop_column("business_users", "status")
    businessuserstatus.drop(op.get_bind(), checkfirst=True)
