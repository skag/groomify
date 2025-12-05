"""Business user service for CRUD operations"""

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.business_user import (
    BusinessUser,
    BusinessUserRole,
    BusinessUserRoleName,
    BusinessUserStatus,
)
from app.schemas.business_user import BusinessUserCreate, BusinessUserUpdate
from app.core.security import hash_password, hash_pin
from app.core.logger import get_logger

logger = get_logger("app.services.business_user_service")


class BusinessUserServiceError(Exception):
    """Base exception for business user service errors"""

    pass


DEFAULT_ROLE_NAMES = {
    BusinessUserRoleName.OWNER.value,
    BusinessUserRoleName.STAFF.value,
    BusinessUserRoleName.GROOMER.value,
}


def get_role_by_name(db: Session, role_name: str | BusinessUserRoleName) -> BusinessUserRole:
    """
    Lookup a role row by name, creating it if it's one of the default roles.
    Raises BusinessUserServiceError if the role cannot be resolved.
    """
    normalized_name = role_name.value if isinstance(role_name, BusinessUserRoleName) else role_name
    role = db.query(BusinessUserRole).filter(BusinessUserRole.name == normalized_name).first()
    if role:
        return role

    if normalized_name in DEFAULT_ROLE_NAMES:
        role = BusinessUserRole(name=normalized_name)
        db.add(role)
        db.flush()  # obtain id without committing transaction
        return role

    raise BusinessUserServiceError(f"Role '{normalized_name}' is not configured")


def get_business_users(db: Session, business_id: int) -> list[BusinessUser]:
    """
    Get all business users for a specific business.

    Args:
        db: Database session
        business_id: Business ID to filter by

    Returns:
        List of business users
    """
    return (
        db.query(BusinessUser)
        .filter(BusinessUser.business_id == business_id)
        .order_by(BusinessUser.created_at.desc())
        .all()
    )


def get_business_user_by_id(
    db: Session, user_id: int, business_id: int
) -> BusinessUser | None:
    """
    Get a single business user by ID, ensuring it belongs to the specified business.

    Args:
        db: Database session
        user_id: User ID
        business_id: Business ID to verify ownership

    Returns:
        BusinessUser if found, None otherwise
    """
    return (
        db.query(BusinessUser)
        .filter(
            and_(
                BusinessUser.id == user_id,
                BusinessUser.business_id == business_id,
            )
        )
        .first()
    )


def get_business_user_by_email(db: Session, email: str) -> BusinessUser | None:
    """
    Get a business user by email.

    Args:
        db: Database session
        email: User email

    Returns:
        BusinessUser if found, None otherwise
    """
    return db.query(BusinessUser).filter(BusinessUser.email == email).first()


def create_business_user(
    db: Session, user_data: BusinessUserCreate, business_id: int
) -> BusinessUser:
    """
    Create a new business user (staff member).

    Args:
        db: Database session
        user_data: User creation data
        business_id: Business ID to associate the user with

    Returns:
        Created BusinessUser

    Raises:
        BusinessUserServiceError: If email already exists or validation fails
    """
    # Check if email already exists
    existing_user = get_business_user_by_email(db, user_data.email)
    if existing_user:
        raise BusinessUserServiceError(
            f"User with email {user_data.email} already exists"
        )

    # Hash password if provided
    password_hash = None
    if user_data.password:
        password_hash = hash_password(user_data.password)

    # Hash PIN if provided
    pin_hash = None
    if user_data.pin:
        pin_hash = hash_pin(user_data.pin)

    # Resolve requested role (default to staff)
    role_name = user_data.role or BusinessUserRoleName.STAFF.value
    role = get_role_by_name(db, role_name)

    # Create user
    db_user = BusinessUser(
        business_id=business_id,
        role_id=role.id,
        role=role,
        email=user_data.email,
        password_hash=password_hash,
        pin_hash=pin_hash,
        status=user_data.status if user_data.status else BusinessUserStatus.ACTIVE,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        start_date=user_data.start_date,
        is_active=True,
        # Compensation fields
        compensation_type=user_data.compensation_type,
        salary_rate=user_data.salary_rate,
        salary_period=user_data.salary_period,
        commission_percent=user_data.commission_percent,
        tip_percent=user_data.tip_percent,
    )

    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        logger.info(
            f"Created business user {db_user.id} for business {business_id}: {db_user.email}"
        )
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating business user: {e}")
        raise BusinessUserServiceError(f"Failed to create business user: {str(e)}")


def update_business_user(
    db: Session, user_id: int, user_data: BusinessUserUpdate, business_id: int
) -> BusinessUser:
    """
    Update an existing business user.

    Args:
        db: Database session
        user_id: User ID to update
        user_data: Updated user data
        business_id: Business ID to verify ownership

    Returns:
        Updated BusinessUser

    Raises:
        BusinessUserServiceError: If user not found or validation fails
    """
    db_user = get_business_user_by_id(db, user_id, business_id)
    if not db_user:
        raise BusinessUserServiceError(
            f"Business user {user_id} not found for business {business_id}"
        )

    # Update fields if provided
    if user_data.email is not None:
        # Check if email is already taken by another user
        existing_user = get_business_user_by_email(db, user_data.email)
        if existing_user and existing_user.id != user_id:
            raise BusinessUserServiceError(
                f"Email {user_data.email} is already taken by another user"
            )
        db_user.email = user_data.email

    if user_data.password is not None:
        db_user.password_hash = hash_password(user_data.password)

    if user_data.pin is not None:
        db_user.pin_hash = hash_pin(user_data.pin)

    if user_data.role is not None:
        db_user.role = get_role_by_name(db, user_data.role)
        db_user.role_id = db_user.role.id

    if user_data.status is not None:
        db_user.status = user_data.status

    if user_data.first_name is not None:
        db_user.first_name = user_data.first_name

    if user_data.last_name is not None:
        db_user.last_name = user_data.last_name

    if user_data.phone is not None:
        db_user.phone = user_data.phone

    if user_data.start_date is not None:
        db_user.start_date = user_data.start_date

    if user_data.end_date is not None:
        db_user.end_date = user_data.end_date

    if user_data.is_active is not None:
        db_user.is_active = user_data.is_active

    # Compensation fields
    if user_data.compensation_type is not None:
        db_user.compensation_type = user_data.compensation_type

    if user_data.salary_rate is not None:
        db_user.salary_rate = user_data.salary_rate

    if user_data.salary_period is not None:
        db_user.salary_period = user_data.salary_period

    if user_data.commission_percent is not None:
        db_user.commission_percent = user_data.commission_percent

    if user_data.tip_percent is not None:
        db_user.tip_percent = user_data.tip_percent

    try:
        db.commit()
        db.refresh(db_user)
        logger.info(f"Updated business user {user_id}")
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating business user {user_id}: {e}")
        raise BusinessUserServiceError(f"Failed to update business user: {str(e)}")


def delete_business_user(db: Session, user_id: int, business_id: int) -> BusinessUser:
    """
    Soft delete a business user by setting them as inactive.

    Args:
        db: Database session
        user_id: User ID to delete
        business_id: Business ID to verify ownership

    Returns:
        Deactivated BusinessUser

    Raises:
        BusinessUserServiceError: If user not found or is an owner
    """
    db_user = get_business_user_by_id(db, user_id, business_id)
    if not db_user:
        raise BusinessUserServiceError(
            f"Business user {user_id} not found for business {business_id}"
        )

    # Prevent deleting owners
    if db_user.role_name == BusinessUserRoleName.OWNER.value:
        raise BusinessUserServiceError("Cannot delete business owner")

    # Soft delete
    db_user.is_active = False
    db_user.status = BusinessUserStatus.TERMINATED

    try:
        db.commit()
        db.refresh(db_user)
        logger.info(f"Deactivated business user {user_id}")
        return db_user
    except Exception as e:
        db.rollback()
        logger.error(f"Error deactivating business user {user_id}: {e}")
        raise BusinessUserServiceError(f"Failed to deactivate business user: {str(e)}")
