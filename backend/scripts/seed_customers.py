"""
Seed script to generate dummy customers, customer_users, and pets using Faker.

Usage:
    cd backend
    uv run python scripts/seed_customers.py --business-id 1 --num-customers 10

    Or set environment variable:
    SEED_BUSINESS_ID=1 uv run python scripts/seed_customers.py --num-customers 10
"""

import json
import os
import random
import sys
from pathlib import Path

import click
from faker import Faker

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.customer import Customer
from app.models.customer_user import CustomerUser
from app.models.pet import Pet
from app.models.business import Business

# Initialize Faker
fake = Faker()

# Load dog breeds from JSON file
SCRIPT_DIR = Path(__file__).parent
with open(SCRIPT_DIR / "dogbreeds.json") as f:
    DOG_BREEDS = json.load(f)["breed"]

def get_random_breed() -> str:
    """Get a random dog breed from the list."""
    return random.choice(DOG_BREEDS)


def get_random_pet_name() -> str:
    """Generate a random pet name using Faker's first_name."""
    return fake.first_name()


def create_pet(db: Session, customer_id: int, business_id: int) -> Pet:
    """Create a single pet with random data."""
    pet = Pet(
        customer_id=customer_id,
        business_id=business_id,
        name=get_random_pet_name(),
        species="Dog",
        breed=get_random_breed(),
        age=random.randint(1, 15),
        weight=round(random.uniform(5.0, 100.0), 1),
        special_notes=fake.sentence() if random.random() > 0.7 else None,
        notes=[],
    )
    db.add(pet)
    return pet


def create_customer_user(
    db: Session, customer_id: int, business_id: int, is_primary: bool = False
) -> CustomerUser:
    """Create a single customer user with random data."""
    first_name = fake.first_name()
    last_name = fake.last_name()

    customer_user = CustomerUser(
        customer_id=customer_id,
        business_id=business_id,
        email=fake.unique.email(),
        first_name=first_name,
        last_name=last_name,
        phone=fake.phone_number()[:20],  # Limit to 20 chars
        is_primary_contact=is_primary,
        notes=[],
    )
    db.add(customer_user)
    return customer_user


def create_customer_with_users_and_pets(
    db: Session, business_id: int
) -> tuple[Customer, list[CustomerUser], list[Pet]]:
    """Create a customer with 1-3 users and 1-3 pets."""
    # Create customer (household)
    last_name = fake.last_name()
    customer = Customer(
        business_id=business_id,
        account_name=f"{last_name} Family",
        status="active",
        address_line1=fake.street_address(),
        address_line2=fake.secondary_address() if random.random() > 0.7 else None,
        city=fake.city(),
        state=fake.state_abbr(),
        country="USA",
        postal_code=fake.zipcode(),
        notes=[],
    )
    db.add(customer)
    db.flush()  # Get the customer ID

    # Create 1-3 customer users
    num_users = random.randint(1, 3)
    users = []
    for i in range(num_users):
        user = create_customer_user(
            db, customer.id, business_id, is_primary=(i == 0)
        )
        users.append(user)

    # Create 1-3 pets with different breeds
    num_pets = random.randint(1, 3)
    pets = []
    used_breeds = set()
    for _ in range(num_pets):
        pet = create_pet(db, customer.id, business_id)
        # Try to get different breeds for variety
        attempts = 0
        while pet.breed in used_breeds and attempts < 5:
            pet.breed = get_random_breed()
            attempts += 1
        used_breeds.add(pet.breed)
        pets.append(pet)

    return customer, users, pets


@click.command()
@click.option(
    "--business-id",
    type=int,
    default=None,
    help="Business ID to create customers for. Can also be set via SEED_BUSINESS_ID env var.",
)
@click.option(
    "--num-customers",
    type=int,
    default=10,
    help="Number of customers to create (default: 10).",
)
def seed_customers(business_id: int | None, num_customers: int):
    """Seed the database with dummy customers, users, and pets."""
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

        click.echo(f"Seeding data for business: {business.name} (ID: {business_id})")
        click.echo(f"Creating {num_customers} customers...")

        total_users = 0
        total_pets = 0

        for i in range(num_customers):
            customer, users, pets = create_customer_with_users_and_pets(db, business_id)
            total_users += len(users)
            total_pets += len(pets)

            if (i + 1) % 10 == 0:
                click.echo(f"  Created {i + 1} customers...")

        db.commit()

        click.echo("\nSeeding complete!")
        click.echo(f"  Customers created: {num_customers}")
        click.echo(f"  Customer users created: {total_users}")
        click.echo(f"  Pets created: {total_pets}")

    except Exception as e:
        db.rollback()
        click.echo(f"Error during seeding: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_customers()
