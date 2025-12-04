"""
Seed script to generate grooming services with varying durations.

Usage:
    cd backend
    uv run python scripts/seed_services.py --business-id 1

    Or set environment variable:
    SEED_BUSINESS_ID=1 uv run python scripts/seed_services.py
"""

import os
import random
import sys
from pathlib import Path

import click

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import SessionLocal
from app.models.business import Business
from app.models.business_user import BusinessUser, BusinessUserRole
from app.models.service import Service
from app.models.service_category import ServiceCategory

# Service definitions with names and descriptions
SERVICE_DEFINITIONS = [
    {
        "name": "Basic Bath & Brush",
        "description": "A refreshing bath with shampoo, blow dry, and thorough brushing.",
    },
    {
        "name": "Full Groom",
        "description": "Complete grooming including bath, haircut, nail trim, and ear cleaning.",
    },
    {
        "name": "Puppy First Groom",
        "description": "Gentle introduction to grooming for puppies. Includes bath, light trim, and nail clip.",
    },
    {
        "name": "De-shedding Treatment",
        "description": "Specialized treatment to reduce shedding with deep brushing and conditioning.",
    },
    {
        "name": "Spa Package Deluxe",
        "description": "Premium spa experience with bath, haircut, teeth brushing, paw treatment, and aromatherapy.",
    },
]

# Duration options: 45, 60, 75, 90, 105, 120, 135, 150, 165, 180 minutes
DURATION_OPTIONS = list(range(45, 181, 15))


def get_or_create_grooming_category(db, business_id: int) -> ServiceCategory:
    """Get existing Grooming category or create one if it doesn't exist."""
    category = (
        db.query(ServiceCategory)
        .filter(ServiceCategory.business_id == business_id, ServiceCategory.name == "Grooming")
        .first()
    )
    if not category:
        category = ServiceCategory(business_id=business_id, name="Grooming")
        db.add(category)
        db.flush()
        click.echo("  Created 'Grooming' category")
    else:
        click.echo("  Using existing 'Grooming' category")
    return category


def get_all_groomers(db, business_id: int) -> list[BusinessUser]:
    """Get all groomers for the business."""
    groomer_role = db.query(BusinessUserRole).filter(BusinessUserRole.name == "groomer").first()
    if not groomer_role:
        return []
    return (
        db.query(BusinessUser)
        .filter(BusinessUser.business_id == business_id, BusinessUser.role_id == groomer_role.id)
        .all()
    )


def create_service(
    db, business_id: int, category_id: int, name: str, description: str, groomers: list[BusinessUser]
) -> Service:
    """Create a service with random duration and price = $1/minute."""
    duration = random.choice(DURATION_OPTIONS)
    price = float(duration)  # $1 per minute

    service = Service(
        business_id=business_id,
        category_id=category_id,
        name=name,
        description=description,
        duration_minutes=duration,
        price=price,
        tax_rate=None,
        is_active=True,
        applies_to_all_animal_types=True,
        applies_to_all_breeds=True,
    )
    db.add(service)
    db.flush()

    # Assign all groomers to this service
    for groomer in groomers:
        service.staff_members.append(groomer)

    return service


@click.command()
@click.option(
    "--business-id",
    type=int,
    default=None,
    help="Business ID to create services for. Can also be set via SEED_BUSINESS_ID env var.",
)
def seed_services(business_id: int | None):
    """Seed the database with 5 grooming services."""
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

        click.echo(f"Seeding services for business: {business.name} (ID: {business_id})")

        # Get or create grooming category
        category = get_or_create_grooming_category(db, business_id)

        # Get all groomers
        groomers = get_all_groomers(db, business_id)
        click.echo(f"  Found {len(groomers)} groomers to assign to services")

        # Create services
        click.echo(f"\nCreating {len(SERVICE_DEFINITIONS)} services...")
        services = []
        for svc_def in SERVICE_DEFINITIONS:
            service = create_service(
                db,
                business_id,
                category.id,
                svc_def["name"],
                svc_def["description"],
                groomers,
            )
            services.append(service)

        db.commit()

        click.echo("\nSeeding complete!")
        click.echo(f"  Services created: {len(services)}")
        click.echo("\nCreated services:")
        for s in services:
            click.echo(f"  - {s.name}: {s.duration_minutes} mins, ${s.price:.2f}")

    except Exception as e:
        db.rollback()
        click.echo(f"Error during seeding: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_services()
