"""Time block service for CRUD operations"""

from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, cast, Date

from app.models.time_block import TimeBlock
from app.models.appointment import Appointment
from app.models.business_user import BusinessUser
from app.schemas.time_block import BLOCK_REASON_LABELS
from app.core.logger import get_logger

logger = get_logger("app.services.time_block_service")


class TimeBlockServiceError(Exception):
    """Base exception for time block service errors"""

    pass


def check_schedule_conflicts(
    db: Session,
    business_id: int,
    staff_id: int,
    start_datetime: datetime,
    duration_minutes: int,
    exclude_block_id: int | None = None,
) -> tuple[bool, str | None]:
    """
    Check if proposed time conflicts with existing appointments or blocks.

    Returns:
        Tuple of (has_conflict, conflict_message)
    """
    end_datetime = start_datetime + timedelta(minutes=duration_minutes)
    conflicts = []

    # Check appointment conflicts
    appointment_query = db.query(Appointment).filter(
        and_(
            Appointment.business_id == business_id,
            Appointment.staff_id == staff_id,
            # Overlap check: new_start < existing_end AND new_end > existing_start
            Appointment.appointment_datetime < end_datetime,
            Appointment.appointment_datetime
            + Appointment.duration_minutes * timedelta(minutes=1)
            > start_datetime,
        )
    )

    conflicting_appointments = appointment_query.all()
    for appt in conflicting_appointments:
        appt_end = appt.appointment_datetime + timedelta(minutes=appt.duration_minutes)
        conflicts.append(
            f"Appointment at {appt.appointment_datetime.strftime('%I:%M %p')}-{appt_end.strftime('%I:%M %p')}"
        )

    # Check block conflicts
    block_query = db.query(TimeBlock).filter(
        and_(
            TimeBlock.business_id == business_id,
            TimeBlock.staff_id == staff_id,
            # Overlap check
            TimeBlock.block_datetime < end_datetime,
            TimeBlock.block_datetime
            + TimeBlock.duration_minutes * timedelta(minutes=1)
            > start_datetime,
        )
    )

    if exclude_block_id:
        block_query = block_query.filter(TimeBlock.id != exclude_block_id)

    conflicting_blocks = block_query.all()
    for block in conflicting_blocks:
        block_end = block.block_datetime + timedelta(minutes=block.duration_minutes)
        reason_label = BLOCK_REASON_LABELS.get(block.reason, block.reason)
        conflicts.append(
            f"{reason_label} at {block.block_datetime.strftime('%I:%M %p')}-{block_end.strftime('%I:%M %p')}"
        )

    if conflicts:
        return True, f"Conflicts with: {', '.join(conflicts)}"

    return False, None


def create_time_block(
    db: Session,
    business_id: int,
    staff_id: int,
    block_datetime: datetime,
    duration_minutes: int,
    reason: str,
    description: str | None = None,
) -> tuple[TimeBlock, bool, str | None]:
    """
    Create a new time block.

    Returns:
        Tuple of (TimeBlock, has_conflict, conflict_message)
    """
    # Verify staff belongs to business and is active
    staff = (
        db.query(BusinessUser)
        .filter(
            and_(
                BusinessUser.id == staff_id,
                BusinessUser.business_id == business_id,
                BusinessUser.is_active == True,
            )
        )
        .first()
    )

    if not staff:
        raise TimeBlockServiceError(
            f"Staff member {staff_id} not found or not active for business {business_id}"
        )

    # Check for conflicts (soft warning, not blocking)
    has_conflict, conflict_message = check_schedule_conflicts(
        db, business_id, staff_id, block_datetime, duration_minutes
    )

    if has_conflict:
        logger.warning(
            f"Creating time block with conflict: {conflict_message} "
            f"(staff_id={staff_id}, datetime={block_datetime})"
        )

    # Create the time block
    time_block = TimeBlock(
        business_id=business_id,
        staff_id=staff_id,
        block_datetime=block_datetime,
        duration_minutes=duration_minutes,
        reason=reason,
        description=description,
    )

    db.add(time_block)
    db.commit()
    db.refresh(time_block)

    logger.info(
        f"Created time block {time_block.id} for staff {staff_id} "
        f"at {block_datetime} (reason: {reason})"
    )

    return time_block, has_conflict, conflict_message


def get_daily_time_blocks(
    db: Session, business_id: int, target_date: date
) -> list[TimeBlock]:
    """Get all time blocks for a specific date"""
    return (
        db.query(TimeBlock)
        .filter(
            and_(
                TimeBlock.business_id == business_id,
                cast(TimeBlock.block_datetime, Date) == target_date,
            )
        )
        .order_by(TimeBlock.block_datetime)
        .all()
    )


def get_time_block_by_id(
    db: Session, business_id: int, block_id: int
) -> TimeBlock:
    """Get a single time block by ID"""
    block = (
        db.query(TimeBlock)
        .filter(
            and_(
                TimeBlock.id == block_id,
                TimeBlock.business_id == business_id,
            )
        )
        .first()
    )

    if not block:
        raise TimeBlockServiceError(
            f"Time block {block_id} not found for business {business_id}"
        )

    return block


def update_time_block(
    db: Session,
    business_id: int,
    block_id: int,
    block_datetime: datetime | None = None,
    duration_minutes: int | None = None,
    reason: str | None = None,
    description: str | None = None,
) -> tuple[TimeBlock, bool, str | None]:
    """
    Update an existing time block.

    Returns:
        Tuple of (TimeBlock, has_conflict, conflict_message)
    """
    block = get_time_block_by_id(db, business_id, block_id)

    # Determine new values for conflict check
    new_datetime = block_datetime if block_datetime is not None else block.block_datetime
    new_duration = (
        duration_minutes if duration_minutes is not None else block.duration_minutes
    )

    # Check for conflicts (excluding this block)
    has_conflict, conflict_message = check_schedule_conflicts(
        db, business_id, block.staff_id, new_datetime, new_duration, exclude_block_id=block_id
    )

    if has_conflict:
        logger.warning(
            f"Updating time block {block_id} with conflict: {conflict_message}"
        )

    # Update fields
    if block_datetime is not None:
        block.block_datetime = block_datetime
    if duration_minutes is not None:
        block.duration_minutes = duration_minutes
    if reason is not None:
        block.reason = reason
    if description is not None:
        block.description = description

    db.commit()
    db.refresh(block)

    logger.info(f"Updated time block {block.id} for business {business_id}")

    return block, has_conflict, conflict_message


def delete_time_block(db: Session, business_id: int, block_id: int) -> bool:
    """Delete a time block"""
    block = get_time_block_by_id(db, business_id, block_id)

    db.delete(block)
    db.commit()

    logger.info(f"Deleted time block {block_id} for business {business_id}")

    return True
