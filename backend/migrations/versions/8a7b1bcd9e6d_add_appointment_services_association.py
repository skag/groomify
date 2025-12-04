"""add appointment_services association table

Revision ID: 8a7b1bcd9e6d
Revises: 1a4dbf2c9b73
Create Date: 2025-12-03 13:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8a7b1bcd9e6d"
down_revision: Union[str, Sequence[str], None] = "1a4dbf2c9b73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create appointment_services association table."""
    op.create_table(
        "appointment_services",
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["appointment_id"], ["appointments.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["service_id"], ["services.id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("appointment_id", "service_id"),
    )
    op.create_index(
        "ix_appointment_services_appointment_id",
        "appointment_services",
        ["appointment_id"],
        unique=False,
    )
    op.create_index(
        "ix_appointment_services_service_id",
        "appointment_services",
        ["service_id"],
        unique=False,
    )


def downgrade() -> None:
    """Drop appointment_services association table."""
    op.drop_index("ix_appointment_services_service_id", table_name="appointment_services")
    op.drop_index("ix_appointment_services_appointment_id", table_name="appointment_services")
    op.drop_table("appointment_services")
