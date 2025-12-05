"""Business user schemas"""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Any
from pydantic import BaseModel, EmailStr, Field, field_serializer

from app.models.business_user import BusinessUserRoleName, BusinessUserStatus


RoleLiteral = Literal["owner", "staff", "groomer"]
CompensationTypeLiteral = Literal["salary", "commission"]
SalaryPeriodLiteral = Literal["hour", "week", "month"]


class BusinessUserBase(BaseModel):
    """Base business user schema"""

    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: str | None = Field(None, max_length=20)
    status: BusinessUserStatus = BusinessUserStatus.ACTIVE
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool = True

    class Config:
        populate_by_name = True


class BusinessUserCreate(BusinessUserBase):
    """
    Schema for creating a business user.

    Note: business_id is NOT included in this schema as it comes from the JWT token.
    """

    role: RoleLiteral = Field(
        default=BusinessUserRoleName.STAFF.value,
        description="Role for the user (owner, staff, groomer)",
    )
    pin: str | None = Field(None, min_length=4, max_length=10)
    password: str | None = Field(None, min_length=8, max_length=100)

    # Compensation fields (typically for groomers)
    compensation_type: CompensationTypeLiteral | None = None
    salary_rate: Decimal | None = Field(None, ge=0)
    salary_period: SalaryPeriodLiteral | None = None
    commission_percent: Decimal | None = Field(None, ge=0, le=100)
    tip_percent: Decimal | None = Field(default=100, ge=0, le=100)


class BusinessUserUpdate(BaseModel):
    """Schema for updating a business user"""

    email: EmailStr | None = None
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20)
    role: RoleLiteral | None = None
    status: BusinessUserStatus | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None
    pin: str | None = Field(None, min_length=4, max_length=10)
    password: str | None = Field(None, min_length=8, max_length=100)

    # Compensation fields (typically for groomers)
    compensation_type: CompensationTypeLiteral | None = None
    salary_rate: Decimal | None = Field(None, ge=0)
    salary_period: SalaryPeriodLiteral | None = None
    commission_percent: Decimal | None = Field(None, ge=0, le=100)
    tip_percent: Decimal | None = Field(None, ge=0, le=100)


class BusinessUser(BusinessUserBase):
    """Schema for business user response"""

    id: int
    business_id: int
    role: Any  # Will be serialized to string
    status: BusinessUserStatus
    start_date: datetime | None
    end_date: datetime | None
    created_at: datetime
    updated_at: datetime

    # Compensation fields
    compensation_type: str | None = None
    salary_rate: Decimal | None = None
    salary_period: str | None = None
    commission_percent: Decimal | None = None
    tip_percent: Decimal | None = None

    @field_serializer('role')
    def serialize_role(self, role: Any, _info) -> str:
        """Serialize role to string, handling both ORM objects and strings."""
        if isinstance(role, str):
            return role
        # If it's the ORM BusinessUserRole object, get the name
        if hasattr(role, 'name'):
            return role.name
        return BusinessUserRoleName.STAFF.value

    class Config:
        from_attributes = True
        populate_by_name = True
