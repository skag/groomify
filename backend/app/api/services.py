"""Service API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    BusinessId,
    OwnerOrStaffUser,
)
from app.schemas.service import (
    Service as ServiceSchema,
    ServiceCreate,
    ServiceUpdate,
)
from app.services.service_service import (
    get_services,
    get_service_by_id,
    get_services_by_category,
    create_service,
    update_service,
    delete_service,
    ServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.services")

router = APIRouter(prefix="/services", tags=["Services"])


@router.get(
    "",
    response_model=list[ServiceSchema],
    summary="Get all services",
    description="Retrieve all services for the authenticated user's business.",
)
def list_services(
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[ServiceSchema]:
    """
    Get all services for the current user's business.

    Requires authentication. Business ID is extracted from JWT token.
    """
    try:
        services = get_services(db, business_id)
        return services
    except Exception as e:
        logger.error(f"Error fetching services: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch services",
        )


@router.get(
    "/{service_id}",
    response_model=ServiceSchema,
    summary="Get a service",
    description="Retrieve a single service by ID.",
)
def get_service(
    service_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> ServiceSchema:
    """
    Get a single service by ID.

    Requires authentication. Service must belong to the same business.
    Business ID is extracted from JWT token.
    """
    service = get_service_by_id(db, service_id, business_id)

    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service with ID {service_id} not found",
        )

    return service


@router.get(
    "/category/{category_id}",
    response_model=list[ServiceSchema],
    summary="Get services by category",
    description="Retrieve all services for a specific category.",
)
def list_services_in_category(
    category_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[ServiceSchema]:
    """
    Get all services in a specific category.

    Requires authentication. Category must belong to the same business.
    Business ID is extracted from JWT token.
    """
    try:
        services = get_services_by_category(db, category_id, business_id)
        return services
    except Exception as e:
        logger.error(f"Error fetching services for category {category_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch services",
        )


@router.post(
    "",
    response_model=ServiceSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a service",
    description="Create a new service. Requires owner or staff role.",
)
def create_new_service(
    service_data: ServiceCreate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> ServiceSchema:
    """
    Create a new service.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(
            f"Creating service '{service_data.name}' for business {current_user.business_id}"
        )
        new_service = create_service(db, service_data, current_user.business_id)
        return new_service

    except ServiceError as e:
        logger.warning(f"Service creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error creating service: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating service",
        )


@router.put(
    "/{service_id}",
    response_model=ServiceSchema,
    summary="Update a service",
    description="Update an existing service. Requires owner or staff role.",
)
def update_existing_service(
    service_id: int,
    service_data: ServiceUpdate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> ServiceSchema:
    """
    Update an existing service.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Updating service {service_id}")
        updated_service = update_service(
            db, service_id, service_data, current_user.business_id
        )
        return updated_service

    except ServiceError as e:
        logger.warning(f"Service update failed: {e}")
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
        logger.error(f"Unexpected error updating service {service_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating service",
        )


@router.delete(
    "/{service_id}",
    response_model=ServiceSchema,
    summary="Delete a service",
    description="Delete a service. Requires owner or staff role.",
)
def delete_existing_service(
    service_id: int,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> ServiceSchema:
    """
    Delete a service.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Deleting service {service_id}")
        deleted_service = delete_service(db, service_id, current_user.business_id)
        return deleted_service

    except ServiceError as e:
        logger.warning(f"Service deletion failed: {e}")
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
        logger.error(f"Unexpected error deleting service {service_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting service",
        )
