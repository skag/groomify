"""add_is_confirmed_and_rename_status_to_checked_in

Revision ID: 34f5e77dfddb
Revises: f9d6e6e14a72
Create Date: 2025-12-04 11:41:12.101510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '34f5e77dfddb'
down_revision: Union[str, Sequence[str], None] = 'f9d6e6e14a72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add is_confirmed column with default value for existing rows
    op.add_column(
        'appointments',
        sa.Column('is_confirmed', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )

    # Rename status from 'confirmed' to 'checked_in' in the appointment_statuses lookup table
    op.execute(
        "UPDATE appointment_statuses SET name = 'checked_in' WHERE name = 'confirmed'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Rename status back from 'checked_in' to 'confirmed'
    op.execute(
        "UPDATE appointment_statuses SET name = 'confirmed' WHERE name = 'checked_in'"
    )

    # Drop is_confirmed column
    op.drop_column('appointments', 'is_confirmed')
