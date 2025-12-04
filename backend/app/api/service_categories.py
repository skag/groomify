"""Service category API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import BusinessId, OwnerOrStaffUser, CurrentUser
from app.schemas.service_category import ServiceCategory, ServiceCategoryCreate
from app.services.service_category_service import create_service_category, ServiceCategoryError
from app.models.service_category import ServiceCategory as ServiceCategoryModel
from app.core.logger import get_logger

logger = get_logger("app.api.service_categories")

router = APIRouter(prefix="/service-categories", tags=["Service Categories"])


@router.get(
    "",
    response_model=list[ServiceCategory],
    summary="Get all service categories",
    description="Retrieve all service categories for the authenticated business.",
)
def list_service_categories(
    business_id: BusinessId,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
) -> list[ServiceCategoryModel]:
    """
    Return all service categories for the current business.
    Requires authentication via bearer token.
    """
    try:
        categories = (
            db.query(ServiceCategoryModel)
            .filter(ServiceCategoryModel.business_id == business_id)
            .order_by(ServiceCategoryModel.name.asc())
            .all()
        )
        return categories
    except Exception as e:
        logger.error(f"Error fetching service categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch service categories",
        )


@router.post(
    "",
    response_model=ServiceCategory,
    status_code=status.HTTP_201_CREATED,
    summary="Create a service category",
    description="Create a new service category for the authenticated business. Requires owner or staff role.",
)
def create_category(
    data: ServiceCategoryCreate,
    business_id: BusinessId,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> ServiceCategory:
    try:
        category = create_service_category(db, business_id, data)
        return category
    except ServiceCategoryError as e:
        logger.warning(f"Service category creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error creating service category: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating service category",
        )
