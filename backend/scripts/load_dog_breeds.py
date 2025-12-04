#!/usr/bin/env python3
"""
Load dog breeds from local JSON file into the database.

This script:
1. Creates a "Dog" animal type if it doesn't exist
2. Reads dog breeds from dogbreeds.json
3. Inserts them into the animal_breeds table

Usage:
    cd backend
    uv run python scripts/load_dog_breeds.py
"""

import json
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import SessionLocal
from app.models.animal_type import AnimalType
from app.models.animal_breed import AnimalBreed


# Path to the dog breeds JSON file
DOG_BREEDS_FILE = Path(__file__).resolve().parent / "dogbreeds.json"


def load_breeds_from_file() -> list[str]:
    """Load dog breeds from the local JSON file."""
    print(f"Reading dog breeds from {DOG_BREEDS_FILE}...")

    with open(DOG_BREEDS_FILE, "r") as f:
        data = json.load(f)

    breeds = data.get("breed", [])
    print(f"Found {len(breeds)} dog breeds")

    return breeds


def get_or_create_dog_type(db: Session) -> AnimalType:
    """Get or create the 'Dog' animal type (case-insensitive check)."""
    # Case-insensitive search for existing "Dog" animal type
    dog_type = (
        db.query(AnimalType)
        .filter(func.lower(AnimalType.name) == "dog")
        .first()
    )

    if dog_type:
        print(f"Found existing '{dog_type.name}' animal type (id={dog_type.id})")
    else:
        dog_type = AnimalType(name="Dog")
        db.add(dog_type)
        db.commit()
        db.refresh(dog_type)
        print(f"Created 'Dog' animal type (id={dog_type.id})")

    return dog_type


def load_breeds(db: Session, dog_type: AnimalType, breeds: list[str]) -> tuple[int, int]:
    """
    Load dog breeds into the database.

    Returns:
        Tuple of (inserted_count, skipped_count)
    """
    inserted = 0
    skipped = 0

    for breed_name in breeds:
        if not breed_name:
            print(f"  Skipping empty breed name")
            skipped += 1
            continue

        # Check if breed already exists for this animal type
        existing = (
            db.query(AnimalBreed)
            .filter(
                AnimalBreed.animal_type_id == dog_type.id,
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
            animal_type_id=dog_type.id,
        )
        db.add(new_breed)
        inserted += 1
        print(f"  Added '{breed_name}'")

    db.commit()
    return inserted, skipped


def main():
    """Main entry point."""
    print("=" * 60)
    print("Dog Breeds Loader")
    print("=" * 60)
    print()

    # Load breeds from file
    try:
        breeds = load_breeds_from_file()
    except FileNotFoundError:
        print(f"Error: Could not find {DOG_BREEDS_FILE}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        sys.exit(1)

    print()

    # Connect to database and load data
    db = SessionLocal()
    try:
        # Get or create Dog animal type
        dog_type = get_or_create_dog_type(db)
        print()

        # Load breeds
        print("Loading breeds into database...")
        inserted, skipped = load_breeds(db, dog_type, breeds)

        print()
        print("=" * 60)
        print("Summary")
        print("=" * 60)
        print(f"  Total breeds from file: {len(breeds)}")
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
