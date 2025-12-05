"""Staff availability service for CRUD operations"""

from datetime import time
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.staff_availability import StaffAvailability
from app.models.business_user import BusinessUser
from app.schemas.staff_availability import (
    StaffAvailabilityCreate,
    StaffAvailabilityBulkUpdate,
)
from app.core.logger import get_logger

logger = get_logger("app.services.staff_availability_service")


class StaffAvailabilityServiceError(Exception):
    """Base exception for staff availability service errors"""

    pass


# Default work hours (Mon-Fri 9am-5pm)
DEFAULT_AVAILABILITY = [
    {"day_of_week": 0, "is_available": True, "start_time": time(9, 0), "end_time": time(17, 0)},
    {"day_of_week": 1, "is_available": True, "start_time": time(9, 0), "end_time": time(17, 0)},
    {"day_of_week": 2, "is_available": True, "start_time": time(9, 0), "end_time": time(17, 0)},
    {"day_of_week": 3, "is_available": True, "start_time": time(9, 0), "end_time": time(17, 0)},
    {"day_of_week": 4, "is_available": True, "start_time": time(9, 0), "end_time": time(17, 0)},
    {"day_of_week": 5, "is_available": False, "start_time": time(9, 0), "end_time": time(17, 0)},
    {"day_of_week": 6, "is_available": False, "start_time": time(9, 0), "end_time": time(17, 0)},
]


def get_staff_availability(
    db: Session, business_user_id: int, business_id: int
) -> list[StaffAvailability]:
    """
    Get all availability entries for a staff member.

    Args:
        db: Database session
        business_user_id: Staff member ID
        business_id: Business ID to verify ownership

    Returns:
        List of StaffAvailability entries (0-7 entries, one per day)

    Raises:
        StaffAvailabilityServiceError: If staff member not found
    """
    # Verify staff belongs to business
    staff = (
        db.query(BusinessUser)
        .filter(
            and_(
                BusinessUser.id == business_user_id,
                BusinessUser.business_id == business_id,
            )
        )
        .first()
    )

    if not staff:
        raise StaffAvailabilityServiceError(
            f"Staff member {business_user_id} not found for business {business_id}"
        )

    return (
        db.query(StaffAvailability)
        .filter(StaffAvailability.business_user_id == business_user_id)
        .order_by(StaffAvailability.day_of_week)
        .all()
    )


def create_default_availability(
    db: Session, business_user_id: int
) -> list[StaffAvailability]:
    """
    Create default availability entries for a staff member (Mon-Fri 9am-5pm).

    Args:
        db: Database session
        business_user_id: Staff member ID

    Returns:
        List of created StaffAvailability entries
    """
    entries = []
    for day_data in DEFAULT_AVAILABILITY:
        entry = StaffAvailability(
            business_user_id=business_user_id,
            day_of_week=day_data["day_of_week"],
            is_available=day_data["is_available"],
            start_time=day_data["start_time"],
            end_time=day_data["end_time"],
        )
        db.add(entry)
        entries.append(entry)

    try:
        db.commit()
        for entry in entries:
            db.refresh(entry)
        logger.info(f"Created default availability for staff {business_user_id}")
        return entries
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating default availability: {e}")
        raise StaffAvailabilityServiceError(
            f"Failed to create default availability: {str(e)}"
        )


def bulk_update_availability(
    db: Session,
    business_user_id: int,
    business_id: int,
    availability_data: StaffAvailabilityBulkUpdate,
) -> list[StaffAvailability]:
    """
    Update all 7 days of availability at once (upsert).

    Args:
        db: Database session
        business_user_id: Staff member ID
        business_id: Business ID to verify ownership
        availability_data: All 7 days of availability

    Returns:
        Updated list of StaffAvailability entries

    Raises:
        StaffAvailabilityServiceError: If validation fails
    """
    # Verify staff belongs to business
    staff = (
        db.query(BusinessUser)
        .filter(
            and_(
                BusinessUser.id == business_user_id,
                BusinessUser.business_id == business_id,
            )
        )
        .first()
    )

    if not staff:
        raise StaffAvailabilityServiceError(
            f"Staff member {business_user_id} not found for business {business_id}"
        )

    # Validate we have exactly 7 unique days
    days = {entry.day_of_week for entry in availability_data.availability}
    if len(days) != 7 or days != {0, 1, 2, 3, 4, 5, 6}:
        raise StaffAvailabilityServiceError(
            "Must provide availability for all 7 days (0-6)"
        )

    # Get existing entries indexed by day
    existing = {
        entry.day_of_week: entry
        for entry in db.query(StaffAvailability)
        .filter(StaffAvailability.business_user_id == business_user_id)
        .all()
    }

    updated_entries = []

    for day_data in availability_data.availability:
        if day_data.day_of_week in existing:
            # Update existing entry
            entry = existing[day_data.day_of_week]
            entry.is_available = day_data.is_available
            entry.start_time = day_data.start_time
            entry.end_time = day_data.end_time
        else:
            # Create new entry
            entry = StaffAvailability(
                business_user_id=business_user_id,
                day_of_week=day_data.day_of_week,
                is_available=day_data.is_available,
                start_time=day_data.start_time,
                end_time=day_data.end_time,
            )
            db.add(entry)

        updated_entries.append(entry)

    try:
        db.commit()
        for entry in updated_entries:
            db.refresh(entry)
        logger.info(f"Updated availability for staff {business_user_id}")
        return sorted(updated_entries, key=lambda x: x.day_of_week)
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating availability: {e}")
        raise StaffAvailabilityServiceError(
            f"Failed to update availability: {str(e)}"
        )
