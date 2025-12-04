"""move appointment status to lookup table

Revision ID: 1a4dbf2c9b73
Revises: 7f3e2d3f5c6b
Create Date: 2025-12-03 13:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "1a4dbf2c9b73"
down_revision: Union[str, Sequence[str], None] = "7f3e2d3f5c6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Previous enum name for appointment status
old_status_enum = sa.Enum(
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
    name="appointmentstatus",
)


def upgrade() -> None:
    """Create appointment_statuses lookup and migrate existing data."""
    # 1) Create lookup table
    op.create_table(
        "appointment_statuses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=50), unique=True, nullable=False),
    )

    # 2) Seed default statuses
    statuses = [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
    ]
    for status in statuses:
        op.execute(
            sa.text(
                "INSERT INTO appointment_statuses (name) VALUES (:name) "
                "ON CONFLICT (name) DO NOTHING"
            ).bindparams(name=status)
        )

    # 3) Add new FK column (nullable for backfill)
    op.add_column("appointments", sa.Column("status_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_appointments_status_id",
        "appointments",
        "appointment_statuses",
        ["status_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_appointments_status_id",
        "appointments",
        ["status_id"],
        unique=False,
    )

    # 4) Backfill status_id from existing enum status column
    op.execute(
        """
        UPDATE appointments a
        SET status_id = s.id
        FROM appointment_statuses s
        WHERE LOWER(a.status::text) = s.name
        """
    )

    # 5) Default any remaining NULLs to 'scheduled'
    op.execute(
        """
        UPDATE appointments a
        SET status_id = s.id
        FROM appointment_statuses s
        WHERE s.name = 'scheduled' AND a.status_id IS NULL
        """
    )

    # 6) Make status_id non-nullable
    op.alter_column("appointments", "status_id", nullable=False)

    # 7) Drop old enum column and type
    op.drop_index("ix_appointments_status", table_name="appointments", if_exists=True)
    op.drop_column("appointments", "status")
    op.execute("DROP TYPE IF EXISTS appointmentstatus")


def downgrade() -> None:
    """Revert back to enum column on appointments."""
    # 1) Recreate enum type
    old_status_enum.create(op.get_bind(), checkfirst=True)

    # 2) Add old column back (nullable for backfill)
    op.add_column(
        "appointments",
        sa.Column("status", old_status_enum, nullable=True),
    )

    # 3) Restore values from lookup table
    op.execute(
        """
        UPDATE appointments a
        SET status = s.name::appointmentstatus
        FROM appointment_statuses s
        WHERE a.status_id = s.id
        """
    )

    # 4) Ensure no NULLs remain
    op.execute(
        """
        UPDATE appointments
        SET status = 'scheduled'
        WHERE status IS NULL
        """
    )
    op.alter_column("appointments", "status", nullable=False)

    # 5) Drop FK column and lookup table
    op.drop_index("ix_appointments_status_id", table_name="appointments")
    op.drop_constraint("fk_appointments_status_id", "appointments", type_="foreignkey")
    op.drop_column("appointments", "status_id")
    op.drop_table("appointment_statuses")
