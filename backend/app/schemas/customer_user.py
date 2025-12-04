"""Customer user schemas"""

from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.schemas.note import Note


class CustomerUserBase(BaseModel):
    """Base customer user schema"""

    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: str | None = Field(None, max_length=20)
    is_primary_contact: bool = False
    oauth_provider: str | None = Field(None, max_length=50)
    oauth_id: str | None = Field(None, max_length=255)


class CustomerUserCreate(CustomerUserBase):
    """Schema for creating a customer user"""

    customer_id: int
    business_id: int


class CustomerUserAdd(BaseModel):
    """Schema for adding a customer user to existing customer"""

    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: str | None = Field(None, max_length=20)


class CustomerUserUpdate(BaseModel):
    """Schema for updating a customer user"""

    email: EmailStr | None = None
    first_name: str | None = Field(None, max_length=100)
    last_name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20)
    is_primary_contact: bool | None = None
    oauth_provider: str | None = Field(None, max_length=50)
    oauth_id: str | None = Field(None, max_length=255)


class CustomerUser(CustomerUserBase):
    """Schema for customer user response"""

    id: int
    customer_id: int
    business_id: int
    notes: list[Note] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
