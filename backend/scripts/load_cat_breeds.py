#!/usr/bin/env python3
"""
Load cat breeds from The Cat API into the database.

This script:
1. Creates a "Cat" animal type if it doesn't exist
2. Fetches all cat breeds from The Cat API
3. Inserts them into the animal_breeds table

Usage:
    cd backend
    uv run python scripts/load_cat_breeds.py
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.animal_type import AnimalType
from app.models.animal_breed import AnimalBreed


# The Cat API endpoint for breeds
CAT_API_URL = "https://api.thecatapi.com/v1/breeds"


def fetch_cat_breeds() -> list[dict]:
    """Fetch all cat breeds from The Cat API."""
    print("Fetching cat breeds from The Cat API...")

    response = httpx.get(CAT_API_URL, timeout=30.0)
    response.raise_for_status()

    breeds = response.json()
    print(f"Found {len(breeds)} cat breeds")

    return breeds


def get_or_create_cat_type(db: Session) -> AnimalType:
    """Get or create the 'Cat' animal type (case-insensitive check)."""
    # Case-insensitive search for existing "Cat" animal type
    cat_type = (
        db.query(AnimalType)
        .filter(func.lower(AnimalType.name) == "cat")
        .first()
    )

    if cat_type:
        print(f"Found existing '{cat_type.name}' animal type (id={cat_type.id})")
    else:
        cat_type = AnimalType(name="Cat")
        db.add(cat_type)
        db.commit()
        db.refresh(cat_type)
        print(f"Created 'Cat' animal type (id={cat_type.id})")

    return cat_type


def load_breeds(db: Session, cat_type: AnimalType, breeds: list[dict]) -> tuple[int, int]:
    """
    Load cat breeds into the database.

    Returns:
        Tuple of (inserted_count, skipped_count)
    """
    inserted = 0
    skipped = 0

    for breed in breeds:
        breed_name = breed.get("name")

        if not breed_name:
            print(f"  Skipping breed with no name: {breed}")
            skipped += 1
            continue

        # Check if breed already exists for this animal type
        existing = (
            db.query(AnimalBreed)
            .filter(
                AnimalBreed.animal_type_id == cat_type.id,
                AnimalBreed.name == breed_name,
            )
            .first()
        )

        if existing:
            print(f"  Skipping '{breed_name}' (already exists)")
            skipped += 1
            continue

        # Create new breed
        new_breed = AnimalBreed(
            name=breed_name,
            animal_type_id=cat_type.id,
        )
        db.add(new_breed)
        inserted += 1
        print(f"  Added '{breed_name}'")

    db.commit()
    return inserted, skipped


def main():
    """Main entry point."""
    print("=" * 60)
    print("Cat Breeds Loader")
    print("=" * 60)
    print()

    # Fetch breeds from API
    try:
        breeds = fetch_cat_breeds()
    except httpx.HTTPError as e:
        print(f"Error fetching breeds from API: {e}")
        sys.exit(1)

    print()

    # Connect to database and load data
    db = SessionLocal()
    try:
        # Get or create Cat animal type
        cat_type = get_or_create_cat_type(db)
        print()

        # Load breeds
        print("Loading breeds into database...")
        inserted, skipped = load_breeds(db, cat_type, breeds)

        print()
        print("=" * 60)
        print("Summary")
        print("=" * 60)
        print(f"  Total breeds from API: {len(breeds)}")
        print(f"  Inserted: {inserted}")
        print(f"  Skipped (already exist): {skipped}")
        print()
        print("Done!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
