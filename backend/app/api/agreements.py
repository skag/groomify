"""Agreement API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    BusinessId,
    CurrentUser,
    OwnerOrStaffUser,
)
from app.schemas.agreement import (
    Agreement as AgreementSchema,
    AgreementCreate,
    AgreementUpdate,
)
from app.services.agreement_service import (
    get_agreements,
    get_agreement_by_id,
    create_agreement,
    update_agreement,
    delete_agreement,
    AgreementServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.agreements")

router = APIRouter(prefix="/agreements", tags=["Agreements"])


@router.get(
    "",
    response_model=list[AgreementSchema],
    summary="Get all agreements",
    description="Retrieve all agreements for the authenticated user's business.",
)
def list_agreements(
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> list[AgreementSchema]:
    """
    Get all agreements for the current user's business.

    Requires authentication. Business ID is extracted from JWT token.
    """
    try:
        agreements = get_agreements(db, business_id)
        return agreements
    except Exception as e:
        logger.error(f"Error fetching agreements: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch agreements",
        )


@router.get(
    "/{agreement_id}",
    response_model=AgreementSchema,
    summary="Get an agreement",
    description="Retrieve a single agreement by ID.",
)
def get_agreement(
    agreement_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> AgreementSchema:
    """
    Get a single agreement by ID.

    Requires authentication. Agreement must belong to the same business.
    Business ID is extracted from JWT token.
    """
    agreement = get_agreement_by_id(db, agreement_id, business_id)

    if not agreement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agreement with ID {agreement_id} not found",
        )

    return agreement


@router.post(
    "",
    response_model=AgreementSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create an agreement",
    description="Create a new agreement. Requires owner or staff role.",
)
def create_new_agreement(
    agreement_data: AgreementCreate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> AgreementSchema:
    """
    Create a new agreement.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(
            f"Creating agreement '{agreement_data.name}' for business {current_user.business_id}"
        )
        new_agreement = create_agreement(db, agreement_data, current_user.business_id)
        return new_agreement

    except AgreementServiceError as e:
        logger.warning(f"Agreement creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error creating agreement: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while creating agreement",
        )


@router.put(
    "/{agreement_id}",
    response_model=AgreementSchema,
    summary="Update an agreement",
    description="Update an existing agreement. Requires owner or staff role.",
)
def update_existing_agreement(
    agreement_id: int,
    agreement_data: AgreementUpdate,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> AgreementSchema:
    """
    Update an existing agreement.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Updating agreement {agreement_id}")
        updated_agreement = update_agreement(
            db, agreement_id, agreement_data, current_user.business_id
        )
        return updated_agreement

    except AgreementServiceError as e:
        logger.warning(f"Agreement update failed: {e}")
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
        logger.error(f"Unexpected error updating agreement {agreement_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while updating agreement",
        )


@router.delete(
    "/{agreement_id}",
    response_model=AgreementSchema,
    summary="Delete an agreement",
    description="Delete an agreement. Requires owner or staff role.",
)
def delete_existing_agreement(
    agreement_id: int,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> AgreementSchema:
    """
    Delete an agreement.

    Requires owner or staff role (admin permissions).
    Business ID is extracted from JWT token.
    """
    try:
        logger.info(f"Deleting agreement {agreement_id}")
        deleted_agreement = delete_agreement(db, agreement_id, current_user.business_id)
        return deleted_agreement

    except AgreementServiceError as e:
        logger.warning(f"Agreement deletion failed: {e}")
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
        logger.error(f"Unexpected error deleting agreement {agreement_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while deleting agreement",
        )
