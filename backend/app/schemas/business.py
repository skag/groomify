"""Business schemas"""

from datetime import datetime
from pydantic import BaseModel, Field


class BusinessBase(BaseModel):
    """Base business schema"""

    name: str = Field(..., max_length=255)
    address1: str | None = Field(None, max_length=255)
    address2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)
    settings: dict | None = Field(default_factory=dict)


class BusinessCreate(BusinessBase):
    """Schema for creating a business"""

    pass


class BusinessUpdate(BaseModel):
    """Schema for updating a business"""

    name: str | None = Field(None, max_length=255)
    address1: str | None = Field(None, max_length=255)
    address2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
    phone: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)
    settings: dict | None = None


class Business(BusinessBase):
    """Schema for business response"""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
