"""Authentication API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import BusinessRegistration, BusinessRegistrationResponse, LoginRequest, LoginResponse
from app.services.auth_service import register_business, login_user, RegistrationError, AuthenticationError
from app.core.logger import get_logger

logger = get_logger("app.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=BusinessRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new business",
    description="Register a new business with the first owner user. The first user is automatically assigned the OWNER role.",
)
def register_business_endpoint(
    registration_data: BusinessRegistration,
    db: Session = Depends(get_db),
) -> BusinessRegistrationResponse:
    """
    Register a new business with owner user

    - **business_name**: Name of the business
    - **first_name**: First name of the owner
    - **last_name**: Last name of the owner
    - **email**: Email address (must be unique)
    - **password**: Password (minimum 8 characters)
    """
    try:
        logger.info(f"Registration attempt for business: {registration_data.business_name}")
        result = register_business(db, registration_data)
        logger.info(f"Successfully registered business: {result.business_name}")
        return result

    except RegistrationError as e:
        logger.warning(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        logger.error(f"Unexpected error during registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration",
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
    description="Authenticate a business user and receive an access token for API requests.",
)
def login_endpoint(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """
    Login with email and password

    - **email**: User's email address
    - **password**: User's password

    Returns an access token that should be included in the Authorization header
    for subsequent API requests as: `Authorization: Bearer {access_token}`
    """
    try:
        logger.info(f"Login attempt for email: {login_data.email}")
        result = login_user(db, login_data)
        logger.info(f"Login successful for user: {login_data.email}")
        return result

    except AuthenticationError as e:
        logger.warning(f"Login failed for {login_data.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    except Exception as e:
        logger.error(f"Unexpected error during login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during login",
        )
