"""
Seed script to populate lookup tables (statuses, roles, etc.)

This should be run before other seed scripts.

Usage:
    cd backend
    uv run python scripts/seed_lookup_tables.py
"""

import sys
from pathlib import Path

import click

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.appointment import AppointmentStatus, AppointmentStatusName
from app.models.business_user import BusinessUserRole, BusinessUserRoleName


def seed_appointment_statuses(db) -> int:
    """Seed appointment statuses lookup table."""
    created = 0
    for status in AppointmentStatusName:
        existing = db.query(AppointmentStatus).filter(AppointmentStatus.name == status.value).first()
        if not existing:
            db.add(AppointmentStatus(name=status.value))
            created += 1
    return created


def seed_business_user_roles(db) -> int:
    """Seed business user roles lookup table."""
    created = 0
    for role in BusinessUserRoleName:
        existing = db.query(BusinessUserRole).filter(BusinessUserRole.name == role.value).first()
        if not existing:
            db.add(BusinessUserRole(name=role.value))
            created += 1
    return created


@click.command()
def seed_lookup_tables():
    """Seed all lookup tables."""
    db = SessionLocal()
    try:
        click.echo("Seeding lookup tables...")

        # Appointment statuses
        statuses_created = seed_appointment_statuses(db)
        click.echo(f"  Appointment statuses: {statuses_created} created")

        # Business user roles
        roles_created = seed_business_user_roles(db)
        click.echo(f"  Business user roles: {roles_created} created")

        db.commit()
        click.echo("\nLookup tables seeded successfully!")

    except Exception as e:
        db.rollback()
        click.echo(f"Error during seeding: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_lookup_tables()
