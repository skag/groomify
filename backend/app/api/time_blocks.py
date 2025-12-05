"""Time blocks API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import BusinessId
from app.schemas.time_block import (
    TimeBlockCreate,
    TimeBlockUpdate,
    TimeBlockResponse,
    BLOCK_REASON_LABELS,
)
from app.services.time_block_service import (
    create_time_block,
    get_time_block_by_id,
    update_time_block,
    delete_time_block,
    TimeBlockServiceError,
)
from app.core.logger import get_logger

logger = get_logger("app.api.time_blocks")

router = APIRouter(prefix="/time-blocks", tags=["Time Blocks"])


def _build_response(block, staff_member, has_conflict: bool = False, conflict_message: str | None = None) -> TimeBlockResponse:
    """Build TimeBlockResponse from TimeBlock model"""
    return TimeBlockResponse(
        id=block.id,
        business_id=block.business_id,
        staff_id=block.staff_id,
        staff_name=f"{staff_member.first_name} {staff_member.last_name}",
        block_datetime=block.block_datetime,
        duration_minutes=block.duration_minutes,
        reason=block.reason,
        reason_label=BLOCK_REASON_LABELS.get(block.reason, block.reason),
        description=block.description,
        created_at=block.created_at,
        updated_at=block.updated_at,
        has_conflict=has_conflict,
        conflict_message=conflict_message,
    )


@router.post(
    "",
    response_model=TimeBlockResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new time block",
    description="Create a time block to mark a groomer's unavailable time (lunch, meeting, etc.).",
)
def create_new_time_block(
    request: TimeBlockCreate,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> TimeBlockResponse:
    """
    Create a new time block for a staff member.

    Required fields:
        - staff_id: The groomer/staff member
        - block_datetime: When the block starts
        - duration_minutes: How long the block is
        - reason: Why the time is blocked (lunch, meeting, personal, etc.)

    Optional fields:
        - description: Additional notes about the block

    Returns:
        Created time block with conflict warning if applicable.
    """
    try:
        block, has_conflict, conflict_message = create_time_block(
            db=db,
            business_id=business_id,
            staff_id=request.staff_id,
            block_datetime=request.block_datetime,
            duration_minutes=request.duration_minutes,
            reason=request.reason.value,
            description=request.description,
        )

        # Reload with relationship for staff name
        block = get_time_block_by_id(db, business_id, block.id)

        return _build_response(block, block.staff_member, has_conflict, conflict_message)

    except TimeBlockServiceError as e:
        logger.warning(f"Time block creation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error creating time block: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create time block",
        )


@router.get(
    "/{block_id}",
    response_model=TimeBlockResponse,
    summary="Get a single time block",
    description="Get details of a specific time block by ID.",
)
def get_block(
    block_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> TimeBlockResponse:
    """Get a single time block by ID."""
    try:
        block = get_time_block_by_id(db, business_id, block_id)
        return _build_response(block, block.staff_member)

    except TimeBlockServiceError as e:
        logger.warning(f"Time block fetch failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error fetching time block {block_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch time block",
        )


@router.patch(
    "/{block_id}",
    response_model=TimeBlockResponse,
    summary="Update an existing time block",
    description="Update a time block's time, duration, reason, or description.",
)
def update_existing_time_block(
    block_id: int,
    request: TimeBlockUpdate,
    business_id: BusinessId,
    db: Session = Depends(get_db),
) -> TimeBlockResponse:
    """
    Update an existing time block.

    Updatable fields:
        - block_datetime: Change the time
        - duration_minutes: Change the duration
        - reason: Change the block reason
        - description: Update notes
    """
    try:
        block, has_conflict, conflict_message = update_time_block(
            db=db,
            business_id=business_id,
            block_id=block_id,
            block_datetime=request.block_datetime,
            duration_minutes=request.duration_minutes,
            reason=request.reason.value if request.reason else None,
            description=request.description,
        )

        return _build_response(block, block.staff_member, has_conflict, conflict_message)

    except TimeBlockServiceError as e:
        logger.warning(f"Time block update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error updating time block {block_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update time block",
        )


@router.delete(
    "/{block_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a time block",
    description="Remove a time block from the schedule.",
)
def delete_existing_time_block(
    block_id: int,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """Delete a time block."""
    try:
        delete_time_block(db, business_id, block_id)

    except TimeBlockServiceError as e:
        logger.warning(f"Time block deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Error deleting time block {block_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete time block",
        )
