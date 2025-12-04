"""Pet API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    BusinessId,
    OwnerOrStaffUser,
)
from app.schemas.pet import (
    Pet as PetSchema,
    PetWithCustomer as PetWithCustomerSchema,
    PetAdd,
    PetUpdate,
)
from app.services.pet_service import (
    get_all_pets,
    get_pets_by_customer,
    get_pet_by_id,
    add_pet_to_customer,
    update_pet,
    delete_pet,
    PetServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.pets")

router = APIRouter(tags=["Pets"])


@router.get(
    "/pets",
    response_model=list[PetWithCustomerSchema],
    summary="Get all pets",
    description="Retrieve all pets for the authenticated business.",
)
def list_all_pets(
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[PetWithCustomerSchema]:
    """
    Get all pets for a business with customer information.

    Requires authentication. Business ID is extracted from JWT token.
    """
    try:
        pets = get_all_pets(db, business_id)

        # Transform to include customer account_name
        result = []
        for pet in pets:
            pet_dict = {
                "id": pet.id,
                "customer_id": pet.customer_id,
                "business_id": pet.business_id,
                "name": pet.name,
                "species": pet.species,
                "breed": pet.breed,
                "age": pet.age,
                "weight": pet.weight,
                "special_notes": pet.special_notes,
                "notes": pet.notes or [],
                "created_at": pet.created_at,
                "updated_at": pet.updated_at,
                "account_name": pet.customer.account_name if pet.customer else "",
            }
            result.append(PetWithCustomerSchema(**pet_dict))

        return result
    except Exception as e:
        logger.error(f"Error fetching all pets for business {business_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pets",
        )


@router.get(
    "/customers/{customer_id}/pets",
    response_model=list[PetSchema],
    summary="Get pets for a customer",
    description="Retrieve all pets for a specific customer.",
)
def list_pets_for_customer(
    customer_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[PetSchema]:
    """
    Get all pets for a specific customer.

    Requires authentication. Customer must belong to the same business.
    Business ID is extracted from JWT token.
    """
    try:
        pets = get_pets_by_customer(db, customer_id, business_id)
        return pets
    except Exception as e:
        logger.error(f"Error fetching pets for customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pets",
        )


@router.post(
    "/customers/{customer_id}/pets",
    response_model=PetSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Add a pet",
    description="Add a new pet to an existing customer. Requires owner or staff role.",
)
def add_pet_to_customer_endpoint(
    customer_id: int,
    pet_data: PetAdd,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> PetSchema:
    """
    Add a new pet to an existing customer.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    Species and breed are determined from animal_type_id and breed_id.
    """
    try:
        logger.info(
            f"Adding pet to customer {customer_id}: {pet_data.name}"
        )
        new_pet = add_pet_to_customer(
            db, customer_id, pet_data, current_user.business_id
        )
        return new_pet

    except PetServiceError as e:
        logger.warning(f"Adding pet failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error adding pet to customer {customer_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while adding pet",
        )


@router.get(
    "/pets/{pet_id}",
    response_model=PetSchema,
    summary="Get a pet",
    description="Retrieve a single pet by ID.",
)
def get_pet(
    pet_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> PetSchema:
    """
    Get a single pet by ID.

    Requires authentication. Pet must belong to the same business.
    Business ID is extracted from JWT token.
    """
    pet = get_pet_by_id(db, pet_id, business_id)

    if not pet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pet with ID {pet_id} not found",
        )

    return pet


@router.put(
    "/pets/{pet_id}",
    response_model=PetSchema,
    summary="Update a pet",
    description="Update an existing pet. Requires owner or staff role.",
)
def update_existing_pet(
    pet_id: int,
    pet_data: PetUpdate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> PetSchema:
    """
    Update an existing pet.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Updating pet {pet_id}")
        updated_pet = update_pet(
            db, pet_id, pet_data, current_user.business_id
        )
        return updated_pet

    except PetServiceError as e:
        logger.warning(f"Pet update failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error updating pet {pet_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating pet",
        )


@router.delete(
    "/pets/{pet_id}",
    response_model=PetSchema,
    summary="Delete a pet",
    description="Delete a pet. Requires owner or staff role.",
)
def delete_existing_pet(
    pet_id: int,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> PetSchema:
    """
    Delete a pet.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Deleting pet {pet_id}")
        deleted_pet = delete_pet(db, pet_id, current_user.business_id)
        return deleted_pet

    except PetServiceError as e:
        logger.warning(f"Pet deletion failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error deleting pet {pet_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting pet",
        )
