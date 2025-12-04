"""add agreements table

Revision ID: 7f3e2d3f5c6b
Revises: 5e4a9db9f3e8
Create Date: 2025-12-03 13:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7f3e2d3f5c6b"
down_revision: Union[str, Sequence[str], None] = "5e4a9db9f3e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

signingoption = sa.Enum("once", "every", "manual", name="signingoption")


def upgrade() -> None:
    """Create agreements table."""
    signingoption.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "agreements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("signing_option", signingoption, nullable=False, server_default="once"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_agreements_id", "agreements", ["id"], unique=False)


def downgrade() -> None:
    """Drop agreements table."""
    op.drop_index("ix_agreements_id", table_name="agreements")
    op.drop_table("agreements")
    signingoption.drop(op.get_bind(), checkfirst=True)
