"""Dependency injection functions for FastAPI"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.business_user import BusinessUser, BusinessUserRoleName
from app.core.logger import get_logger

logger = get_logger("app.core.dependencies")

security = HTTPBearer()


class AuthenticatedUser:
    """Container for authenticated user information extracted from JWT token"""

    def __init__(
        self,
        user_id: int,
        email: str,
        business_id: int,
        role: str,
        token_payload: dict | None = None,
    ):
        self.user_id = user_id
        self.email = email
        self.business_id = business_id
        self.role = role
        self.token_payload = token_payload or {}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """
    Dependency to get the current authenticated user from JWT token.

    Extracts user information including business_id from the JWT token payload.

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials

    try:
        # Decode JWT token
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        email = payload.get("email")
        business_id = payload.get("business_id")
        role = payload.get("role")

        if user_id is None or email is None or business_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Fetch user from database to verify they still exist and are active
        user = db.query(BusinessUser).filter(BusinessUser.id == int(user_id)).first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return AuthenticatedUser(
            user_id=int(user_id),
            email=email,
            business_id=int(business_id),
            role=role or "",
            token_payload=payload,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error decoding token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_business_id(current_user: AuthenticatedUser = Depends(get_current_user)) -> int:
    """
    Dependency to extract business_id from authenticated user.

    This is the primary way to get business_id in API endpoints.
    The business_id comes from the JWT token, not from the request body.

    Args:
        current_user: Authenticated user from token

    Returns:
        Business ID as integer

    Raises:
        HTTPException: If business_id is missing from token
    """
    if not current_user.business_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to any business",
        )
    return current_user.business_id


def require_owner(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """
    Dependency to require OWNER role.

    Raises:
        HTTPException: If user is not an owner
    """
    if current_user.role != BusinessUserRoleName.OWNER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only business owners can perform this action",
        )
    return current_user


def require_owner_or_staff(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """
    Dependency to require owner or staff role (admin permissions).
    Staff members have administrative privileges.

    Raises:
        HTTPException: If user is not owner or staff
    """
    if current_user.role not in [
        BusinessUserRoleName.OWNER.value,
        BusinessUserRoleName.STAFF.value,
    ]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions. Only owners and staff can perform this action.",
        )
    return current_user


# Type aliases for convenience in API endpoints
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
BusinessId = Annotated[int, Depends(get_business_id)]
OwnerUser = Annotated[AuthenticatedUser, Depends(require_owner)]
OwnerOrStaffUser = Annotated[AuthenticatedUser, Depends(require_owner_or_staff)]
