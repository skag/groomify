"""Business user (staff) API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    BusinessId,
    CurrentUser,
    OwnerOrStaffUser,
)
from app.schemas.business_user import (
    BusinessUser as BusinessUserSchema,
    BusinessUserCreate,
    BusinessUserUpdate,
)
from app.schemas.staff_availability import (
    StaffAvailability as StaffAvailabilitySchema,
    StaffAvailabilityBulkUpdate,
)
from app.services.business_user_service import (
    get_business_users,
    get_business_user_by_id,
    create_business_user,
    update_business_user,
    delete_business_user,
    BusinessUserServiceError,
)
from app.services.staff_availability_service import (
    get_staff_availability,
    bulk_update_availability,
    StaffAvailabilityServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.business_users")

router = APIRouter(prefix="/business-users", tags=["Business Users"])


@router.get(
    "",
    response_model=list[BusinessUserSchema],
    summary="Get all staff members",
    description="Retrieve all staff members for the authenticated user's business.",
)
def list_business_users(
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[BusinessUserSchema]:
    """
    Get all business users (staff) for the current user's business.

    Requires authentication. Business ID is extracted from JWT token.
    """
    try:
        users = get_business_users(db, business_id)
        return users
    except Exception as e:
        logger.error(f"Error fetching business users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch staff members",
        )


@router.get(
    "/{user_id}",
    response_model=BusinessUserSchema,
    summary="Get a staff member",
    description="Retrieve a single staff member by ID.",
)
def get_business_user(
    user_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> BusinessUserSchema:
    """
    Get a single business user by ID.

    Requires authentication. User must belong to the same business.
    Business ID is extracted from JWT token.
    """
    user = get_business_user_by_id(db, user_id, business_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Staff member with ID {user_id} not found",
        )

    return user


@router.post(
    "",
    response_model=BusinessUserSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a staff member",
    description="Create a new staff member. Requires owner or staff role.",
)
def create_staff_member(
    user_data: BusinessUserCreate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> BusinessUserSchema:
    """
    Create a new staff member.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(
            f"Creating staff member {user_data.email} for business {current_user.business_id}"
        )
        new_user = create_business_user(db, user_data, current_user.business_id)
        return new_user

    except BusinessUserServiceError as e:
        logger.warning(f"Staff creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error creating staff member: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating staff member",
        )


@router.put(
    "/{user_id}",
    response_model=BusinessUserSchema,
    summary="Update a staff member",
    description="Update an existing staff member. Requires owner or staff role.",
)
def update_staff_member(
    user_id: int,
    user_data: BusinessUserUpdate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> BusinessUserSchema:
    """
    Update an existing staff member.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Updating staff member {user_id}")
        updated_user = update_business_user(
            db, user_id, user_data, current_user.business_id
        )
        return updated_user

    except BusinessUserServiceError as e:
        logger.warning(f"Staff update failed: {e}")
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
        logger.error(f"Unexpected error updating staff member {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating staff member",
        )


@router.delete(
    "/{user_id}",
    response_model=BusinessUserSchema,
    summary="Delete a staff member",
    description="Soft delete a staff member (set as inactive). Requires owner or staff role.",
)
def delete_staff_member(
    user_id: int,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> BusinessUserSchema:
    """
    Soft delete a staff member by setting them as inactive.

    Requires owner or staff role (admin permissions).
    Cannot delete business owners.
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Deactivating staff member {user_id}")
        deactivated_user = delete_business_user(db, user_id, current_user.business_id)
        return deactivated_user

    except BusinessUserServiceError as e:
        logger.warning(f"Staff deletion failed: {e}")
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        if "Cannot delete" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error deleting staff member {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting staff member",
        )


# ============================================================================
# Staff Availability Endpoints
# ============================================================================


@router.get(
    "/{user_id}/availability",
    response_model=list[StaffAvailabilitySchema],
    summary="Get staff availability",
    description="Get the weekly availability schedule for a staff member.",
)
def get_user_availability(
    user_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[StaffAvailabilitySchema]:
    """
    Get all 7 days of availability for a staff member.

    Returns an empty list if no availability has been set yet.
    """
    try:
        availability = get_staff_availability(db, user_id, business_id)
        return availability

    except StaffAvailabilityServiceError as e:
        logger.warning(f"Failed to get availability: {e}")
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
        logger.error(f"Error fetching availability for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch availability",
        )


@router.put(
    "/{user_id}/availability",
    response_model=list[StaffAvailabilitySchema],
    summary="Update staff availability",
    description="Update the weekly availability schedule for a staff member (all 7 days).",
)
def update_user_availability(
    user_id: int,
    availability_data: StaffAvailabilityBulkUpdate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> list[StaffAvailabilitySchema]:
    """
    Update all 7 days of availability for a staff member.

    Requires owner or staff role.
    Must provide availability for all 7 days (0=Monday through 6=Sunday).
    """
    try:
        logger.info(f"Updating availability for staff member {user_id}")
        availability = bulk_update_availability(
            db, user_id, current_user.business_id, availability_data
        )
        return availability

    except StaffAvailabilityServiceError as e:
        logger.warning(f"Failed to update availability: {e}")
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
        logger.error(f"Error updating availability for user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update availability",
        )
