"""Animal types API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.models.animal_type import AnimalType as AnimalTypeModel
from app.models.animal_breed import AnimalBreed
from app.schemas.animal_breed import AnimalBreed as AnimalBreedSchema
from app.schemas.animal_type import AnimalType, AnimalTypeWithBreeds
from app.core.logger import get_logger

logger = get_logger("app.api.animal_types")

router = APIRouter(prefix="/animal-types", tags=["Animal Types"])


@router.get(
    "",
    response_model=list[AnimalType],
    summary="Get all animal types",
    description="Retrieve all animal types with their IDs. Requires authentication.",
)
def list_animal_types(
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> list[AnimalTypeModel]:
    """
    Return all animal types (e.g., Dog, Cat, etc.) with IDs.

    Requires authentication via bearer token.
    """
    try:
        types = db.query(AnimalTypeModel).order_by(AnimalTypeModel.name.asc()).all()
        return types
    except Exception as e:
        logger.error(f"Error fetching animal types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch animal types",
        )


@router.get(
    "/{animal_type_id}",
    response_model=AnimalTypeWithBreeds,
    summary="Get animal type by ID with breeds",
    description="Retrieve a specific animal type with all its breeds. Requires authentication.",
)
def get_animal_type_with_breeds(
    animal_type_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> AnimalTypeModel:
    """
    Return animal type details with all associated breeds.
    Requires authentication via bearer token.
    """
    try:
        animal_type = (
            db.query(AnimalTypeModel)
            .filter(AnimalTypeModel.id == animal_type_id)
            .first()
        )
        if not animal_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Animal type {animal_type_id} not found",
            )
        return animal_type
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching animal type {animal_type_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch animal type",
        )


@router.get(
    "/{animal_type_id}/breeds",
    response_model=list[AnimalBreedSchema],
    summary="Get all breeds for an animal type",
    description="Retrieve all breeds for the specified animal type. Requires authentication.",
)
def list_animal_breeds_for_type(
    animal_type_id: int,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> list[AnimalBreed]:
    """
    Return all breeds belonging to the given animal type ID.
    Requires authentication via bearer token.
    """
    try:
        # Ensure animal type exists
        animal_type = (
            db.query(AnimalTypeModel)
            .filter(AnimalTypeModel.id == animal_type_id)
            .first()
        )
        if not animal_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Animal type {animal_type_id} not found",
            )

        breeds = (
            db.query(AnimalBreed)
            .filter(AnimalBreed.animal_type_id == animal_type_id)
            .order_by(AnimalBreed.name.asc())
            .all()
        )
        return breeds
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching breeds for animal type {animal_type_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch animal breeds",
        )
