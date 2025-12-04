"""normalize businessuserstatus enum values to lowercase

Revision ID: 5e4a9db9f3e8
Revises: 4b2f8aa9c0d4
Create Date: 2025-12-03 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "5e4a9db9f3e8"
down_revision: Union[str, Sequence[str], None] = "4b2f8aa9c0d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename enum labels to lowercase to match the model."""
    op.execute(
        """
        DO $$
        DECLARE
            labels text[] := ARRAY['ACTIVE', 'INACTIVE', 'TERMINATED'];
            lower_labels text[] := ARRAY['active', 'inactive', 'terminated'];
            i int;
        BEGIN
            FOR i IN 1..array_length(labels, 1) LOOP
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'businessuserstatus'
                    AND e.enumlabel = labels[i]
                ) THEN
                    EXECUTE format(
                        'ALTER TYPE businessuserstatus RENAME VALUE %L TO %L',
                        labels[i], lower_labels[i]
                    );
                END IF;
            END LOOP;
        END
        $$;
        """
    )


def downgrade() -> None:
    """Revert enum labels back to uppercase."""
    op.execute(
        """
        DO $$
        DECLARE
            labels text[] := ARRAY['active', 'inactive', 'terminated'];
            upper_labels text[] := ARRAY['ACTIVE', 'INACTIVE', 'TERMINATED'];
            i int;
        BEGIN
            FOR i IN 1..array_length(labels, 1) LOOP
                IF EXISTS (
                    SELECT 1
                    FROM pg_enum e
                    JOIN pg_type t ON t.oid = e.enumtypid
                    WHERE t.typname = 'businessuserstatus'
                    AND e.enumlabel = labels[i]
                ) THEN
                    EXECUTE format(
                        'ALTER TYPE businessuserstatus RENAME VALUE %L TO %L',
                        labels[i], upper_labels[i]
                    );
                END IF;
            END LOOP;
        END
        $$;
        """
    )
