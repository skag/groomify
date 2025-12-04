"""move business user role to lookup table

Revision ID: 4b2f8aa9c0d4
Revises: bc7a4d8c26f1
Create Date: 2025-12-03 12:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "4b2f8aa9c0d4"
down_revision: Union[str, Sequence[str], None] = "bc7a4d8c26f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Previous enum name for the role column
old_role_enum = sa.Enum("owner", "staff", "groomer", name="businessuserrole")


def upgrade() -> None:
    """Move business_user role to a lookup table with FK."""
    # 1) Create lookup table
    op.create_table(
        "business_user_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=50), nullable=False, unique=True, index=True),
    )

    # 2) Seed default roles
    role_names = ["owner", "staff", "groomer"]
    for role in role_names:
        op.execute(
            sa.text(
                "INSERT INTO business_user_roles (name) VALUES (:name) "
                "ON CONFLICT (name) DO NOTHING"
            ).bindparams(name=role)
        )

    # 3) Add new FK column (nullable during backfill)
    op.add_column("business_users", sa.Column("role_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_business_users_role_id",
        "business_users",
        "business_user_roles",
        ["role_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_business_users_role_id",
        "business_users",
        ["role_id"],
        unique=False,
    )

    # 4) Backfill role_id from existing enum column (role)
    op.execute(
        """
        UPDATE business_users bu
        SET role_id = r.id
        FROM business_user_roles r
        WHERE LOWER(bu.role::text) = r.name
        """
    )

    # 5) Default any remaining NULLs to 'staff'
    op.execute(
        """
        UPDATE business_users bu
        SET role_id = r.id
        FROM business_user_roles r
        WHERE r.name = 'staff' AND bu.role_id IS NULL
        """
    )

    # 6) Make role_id non-nullable
    op.alter_column("business_users", "role_id", nullable=False)

    # 7) Drop old enum column and type (and any related index)
    op.drop_index("ix_business_users_role", table_name="business_users", if_exists=True)
    op.drop_column("business_users", "role")
    op.execute("DROP TYPE IF EXISTS businessuserrole")


def downgrade() -> None:
    """Revert to enum column on business_users."""
    # 1) Recreate enum type
    old_role_enum.create(op.get_bind(), checkfirst=True)

    # 2) Add old column back (nullable for backfill)
    op.add_column(
        "business_users",
        sa.Column("role", old_role_enum, nullable=True),
    )

    # 3) Restore values from lookup table
    op.execute(
        """
        UPDATE business_users bu
        SET role = r.name::businessuserrole
        FROM business_user_roles r
        WHERE bu.role_id = r.id
        """
    )

    # 4) Ensure no NULLs remain
    op.execute(
        """
        UPDATE business_users
        SET role = 'staff'
        WHERE role IS NULL
        """
    )

    op.alter_column("business_users", "role", nullable=False)

    # 5) Drop FK column and lookup table
    op.drop_index("ix_business_users_role_id", table_name="business_users")
    op.drop_constraint("fk_business_users_role_id", "business_users", type_="foreignkey")
    op.drop_column("business_users", "role_id")
    op.drop_table("business_user_roles")
