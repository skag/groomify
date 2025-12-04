"""Authentication and registration services"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.business import Business
from app.models.business_user import BusinessUser, BusinessUserRoleName
from app.services.business_user_service import get_role_by_name
from app.schemas.auth import BusinessRegistration, BusinessRegistrationResponse, LoginRequest, LoginResponse
from app.core.security import hash_password, verify_password, create_access_token
from app.core.logger import get_logger

logger = get_logger("app.services.auth")


class RegistrationError(Exception):
    """Custom exception for registration errors"""

    pass


class AuthenticationError(Exception):
    """Custom exception for authentication errors"""

    pass


def register_business(
    db: Session, registration_data: BusinessRegistration
) -> BusinessRegistrationResponse:
    """
    Register a new business with its first owner user

    Args:
        db: Database session
        registration_data: Business registration data

    Returns:
        BusinessRegistrationResponse with business and user IDs

    Raises:
        RegistrationError: If email already exists or registration fails
    """
    try:
        # Pre-flight check to avoid integrity errors on duplicate email
        existing_user = (
            db.query(BusinessUser)
            .filter(BusinessUser.email == registration_data.email)
            .first()
        )
        if existing_user:
            logger.warning(f"Registration blocked - email already registered: {registration_data.email}")
            raise RegistrationError("Email already registered")

        # Create the business
        business = Business(name=registration_data.business_name)
        db.add(business)
        db.flush()  # Flush to get the business ID

        logger.info(f"Created business: {business.name} (ID: {business.id})")

        # Hash the password
        password_hash = hash_password(registration_data.password)
        logger.info(f"Password hashed successfully")

        # Resolve owner role
        owner_role = get_role_by_name(db, BusinessUserRoleName.OWNER.value)

        # Create the first user as OWNER
        owner = BusinessUser(
            business_id=business.id,
            role_id=owner_role.id,
            role=owner_role,
            email=registration_data.email,
            password_hash=password_hash,
            first_name=registration_data.first_name,
            last_name=registration_data.last_name,
            is_active=True,
        )
        db.add(owner)
        db.commit()
        db.refresh(business)
        db.refresh(owner)

        logger.info(
            f"Created owner user: {owner.email} for business {business.name} (User ID: {owner.id})"
        )

        return BusinessRegistrationResponse(
            business_id=business.id,
            user_id=owner.id,
            business_name=business.name,
            email=owner.email,
        )

    except IntegrityError as e:
        db.rollback()
        logger.error(f"Registration failed - integrity error: {e}")
        # Check if it's a unique constraint violation on email
        pg_code = getattr(getattr(e, "orig", None), "pgcode", "")
        if pg_code == "23505" or (
            "unique constraint" in str(e).lower() and "email" in str(e).lower()
        ):
            raise RegistrationError("Email already registered")
        raise RegistrationError("Registration failed due to data conflict")

    except Exception as e:
        db.rollback()
        logger.error(f"Registration failed: {e}")
        raise RegistrationError(f"Registration failed: {str(e)}")


def login_user(db: Session, login_data: LoginRequest) -> LoginResponse:
    """
    Authenticate a business user and return access token

    Args:
        db: Database session
        login_data: Login credentials (email and password)

    Returns:
        LoginResponse with access token and user details

    Raises:
        AuthenticationError: If credentials are invalid or user is inactive
    """
    try:
        # Find user by email
        user = db.query(BusinessUser).filter(BusinessUser.email == login_data.email).first()

        if not user:
            logger.warning(f"Login attempt for non-existent email: {login_data.email}")
            raise AuthenticationError("Invalid email or password")

        # Check if user is active
        if not user.is_active:
            logger.warning(f"Login attempt for inactive user: {login_data.email}")
            raise AuthenticationError("Account is inactive")

        # Verify password
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            logger.warning(f"Invalid password attempt for user: {login_data.email}")
            raise AuthenticationError("Invalid email or password")

        # Create access token with user information
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "business_id": user.business_id,
            "role": user.role_name,
        }
        access_token = create_access_token(data=token_data)

        logger.info(f"User logged in successfully: {user.email} (ID: {user.id})")

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            email=user.email,
            business_id=user.business_id,
            role=user.role_name or "",
            first_name=user.first_name,
            last_name=user.last_name,
        )

    except AuthenticationError:
        # Re-raise authentication errors as-is
        raise

    except Exception as e:
        logger.error(f"Login failed with unexpected error: {e}")
        raise AuthenticationError("Login failed due to an unexpected error")
