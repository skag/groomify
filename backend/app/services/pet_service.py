"""Pet service for CRUD operations"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime, timezone

from app.models.pet import Pet
from app.models.customer import Customer
from app.models.animal_type import AnimalType
from app.models.animal_breed import AnimalBreed
from app.schemas.pet import PetAdd, PetUpdate
from app.core.logger import get_logger

logger = get_logger("app.services.pet_service")


class PetServiceError(Exception):
    """Base exception for pet service errors"""

    pass


def get_all_pets(db: Session, business_id: int) -> list[Pet]:
    """
    Get all pets for a business with customer information.

    Args:
        db: Database session
        business_id: Business ID to filter pets

    Returns:
        List of all pets for the business with customer relationship loaded
    """
    return (
        db.query(Pet)
        .options(joinedload(Pet.customer))
        .filter(Pet.business_id == business_id)
        .order_by(Pet.created_at.desc())
        .all()
    )


def get_pets_by_customer(db: Session, customer_id: int, business_id: int) -> list[Pet]:
    """
    Get all pets for a specific customer.

    Args:
        db: Database session
        customer_id: Customer ID
        business_id: Business ID to verify ownership

    Returns:
        List of pets for the customer
    """
    return (
        db.query(Pet)
        .filter(
            and_(
                Pet.customer_id == customer_id,
                Pet.business_id == business_id,
            )
        )
        .order_by(Pet.created_at.desc())
        .all()
    )


def get_pet_by_id(db: Session, pet_id: int, business_id: int) -> Pet | None:
    """
    Get a single pet by ID, ensuring it belongs to the specified business.

    Args:
        db: Database session
        pet_id: Pet ID
        business_id: Business ID to verify ownership

    Returns:
        Pet if found, None otherwise
    """
    return (
        db.query(Pet)
        .filter(
            and_(
                Pet.id == pet_id,
                Pet.business_id == business_id,
            )
        )
        .first()
    )


def add_pet_to_customer(
    db: Session, customer_id: int, pet_data: PetAdd, business_id: int
) -> Pet:
    """
    Add a new pet to an existing customer.

    Args:
        db: Database session
        customer_id: Customer ID to add pet to
        pet_data: Pet data
        business_id: Business ID to verify ownership

    Returns:
        Created Pet

    Raises:
        PetServiceError: If customer not found or validation fails
    """
    # Verify customer exists and belongs to business
    db_customer = (
        db.query(Customer)
        .filter(
            and_(
                Customer.id == customer_id,
                Customer.business_id == business_id,
            )
        )
        .first()
    )

    if not db_customer:
        raise PetServiceError(
            f"Customer {customer_id} not found for business {business_id}"
        )

    # Get animal type to determine species
    animal_type = (
        db.query(AnimalType)
        .filter(AnimalType.id == pet_data.animal_type_id)
        .first()
    )

    if not animal_type:
        raise PetServiceError(
            f"Animal type {pet_data.animal_type_id} not found"
        )

    # Get breed name if breed_id provided
    breed_name = None
    if pet_data.breed_id:
        breed = (
            db.query(AnimalBreed)
            .filter(AnimalBreed.id == pet_data.breed_id)
            .first()
        )
        if breed:
            breed_name = breed.name

    # Calculate age from birth_date if provided
    age = None
    if pet_data.birth_date:
        today = datetime.now(timezone.utc).date()
        age = (
            today.year
            - pet_data.birth_date.year
            - (
                (today.month, today.day)
                < (pet_data.birth_date.month, pet_data.birth_date.day)
            )
        )

    # Build special notes with spayed/neutered status
    special_notes = f"Spayed/Neutered: {'Yes' if pet_data.spayed_neutered else 'No'}"

    try:
        # Create new pet
        db_pet = Pet(
            customer_id=customer_id,
            business_id=business_id,
            name=pet_data.name,
            species=animal_type.name,
            breed=breed_name,
            age=age,
            weight=pet_data.weight,
            special_notes=special_notes,
        )

        db.add(db_pet)
        db.commit()
        db.refresh(db_pet)

        logger.info(
            f"Added pet {db_pet.id} ({db_pet.name}) to customer {customer_id}"
        )

        return db_pet

    except Exception as e:
        db.rollback()
        logger.error(f"Error adding pet to customer {customer_id}: {e}")
        raise PetServiceError(f"Failed to add pet: {str(e)}")


def update_pet(
    db: Session, pet_id: int, pet_data: PetUpdate, business_id: int
) -> Pet:
    """
    Update an existing pet.

    Args:
        db: Database session
        pet_id: Pet ID to update
        pet_data: Updated pet data
        business_id: Business ID to verify ownership

    Returns:
        Updated Pet

    Raises:
        PetServiceError: If pet not found or validation fails
    """
    db_pet = get_pet_by_id(db, pet_id, business_id)
    if not db_pet:
        raise PetServiceError(
            f"Pet {pet_id} not found for business {business_id}"
        )

    # Update fields if provided
    if pet_data.name is not None:
        db_pet.name = pet_data.name

    if pet_data.species is not None:
        db_pet.species = pet_data.species

    if pet_data.breed is not None:
        db_pet.breed = pet_data.breed

    if pet_data.age is not None:
        db_pet.age = pet_data.age

    if pet_data.weight is not None:
        db_pet.weight = pet_data.weight

    if pet_data.special_notes is not None:
        db_pet.special_notes = pet_data.special_notes

    try:
        db.commit()
        db.refresh(db_pet)
        logger.info(f"Updated pet {pet_id}")
        return db_pet
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating pet {pet_id}: {e}")
        raise PetServiceError(f"Failed to update pet: {str(e)}")


def delete_pet(db: Session, pet_id: int, business_id: int) -> Pet:
    """
    Delete a pet.

    Args:
        db: Database session
        pet_id: Pet ID to delete
        business_id: Business ID to verify ownership

    Returns:
        Deleted Pet

    Raises:
        PetServiceError: If pet not found
    """
    db_pet = get_pet_by_id(db, pet_id, business_id)
    if not db_pet:
        raise PetServiceError(
            f"Pet {pet_id} not found for business {business_id}"
        )

    try:
        db.delete(db_pet)
        db.commit()
        logger.info(f"Deleted pet {pet_id}")
        return db_pet
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting pet {pet_id}: {e}")
        raise PetServiceError(f"Failed to delete pet: {str(e)}")
