"""
Seed script to generate dummy business users (groomers) using Faker.

Usage:
    cd backend
    uv run python scripts/seed_groomers.py --business-id 1 --num-groomers 5

    Or set environment variable:
    SEED_BUSINESS_ID=1 uv run python scripts/seed_groomers.py
"""

import os
import sys
from pathlib import Path

import click
from faker import Faker

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.business import Business
from app.models.business_user import BusinessUser, BusinessUserRole, BusinessUserStatus

# Initialize Faker
fake = Faker()


def get_groomer_role_id(db) -> int:
    """Get the groomer role ID from the database."""
    role = db.query(BusinessUserRole).filter(BusinessUserRole.name == "groomer").first()
    if not role:
        raise ValueError("Groomer role not found. Make sure business_user_roles table is seeded.")
    return role.id


def create_groomer(db, business_id: int, role_id: int) -> BusinessUser:
    """Create a single groomer with random data."""
    first_name = fake.first_name()
    last_name = fake.last_name()

    groomer = BusinessUser(
        business_id=business_id,
        role_id=role_id,
        email=fake.unique.email(),
        first_name=first_name,
        last_name=last_name,
        phone=fake.phone_number()[:20],
        status=BusinessUserStatus.ACTIVE,
        is_active=True,
        password_hash=None,
        pin_hash=None,
    )
    db.add(groomer)
    return groomer


@click.command()
@click.option(
    "--business-id",
    type=int,
    default=None,
    help="Business ID to create groomers for. Can also be set via SEED_BUSINESS_ID env var.",
)
@click.option(
    "--num-groomers",
    type=int,
    default=5,
    help="Number of groomers to create (default: 5).",
)
def seed_groomers(business_id: int | None, num_groomers: int):
    """Seed the database with dummy groomers."""
    # Get business ID from parameter or environment variable
    if business_id is None:
        business_id = os.environ.get("SEED_BUSINESS_ID")
        if business_id:
            business_id = int(business_id)

    if not business_id:
        click.echo("Error: Business ID is required. Use --business-id or set SEED_BUSINESS_ID env var.")
        sys.exit(1)

    db = SessionLocal()
    try:
        # Verify business exists
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            click.echo(f"Error: Business with ID {business_id} not found.")
            sys.exit(1)

        # Get groomer role ID
        role_id = get_groomer_role_id(db)

        click.echo(f"Seeding groomers for business: {business.name} (ID: {business_id})")
        click.echo(f"Creating {num_groomers} groomers...")

        groomers = []
        for i in range(num_groomers):
            groomer = create_groomer(db, business_id, role_id)
            groomers.append(groomer)

        db.commit()

        click.echo("\nSeeding complete!")
        click.echo(f"  Groomers created: {num_groomers}")
        click.echo("\nCreated groomers:")
        for g in groomers:
            click.echo(f"  - {g.first_name} {g.last_name} ({g.email})")

    except Exception as e:
        db.rollback()
        click.echo(f"Error during seeding: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_groomers()
