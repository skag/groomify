"""Service category schemas"""

from datetime import datetime
from pydantic import BaseModel, Field


class ServiceCategoryBase(BaseModel):
    """Base schema for service category"""

    name: str = Field(..., max_length=255)


class ServiceCategoryCreate(ServiceCategoryBase):
    """Schema for creating a service category"""

    pass


class ServiceCategory(ServiceCategoryBase):
    """Response schema for service category"""

    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
