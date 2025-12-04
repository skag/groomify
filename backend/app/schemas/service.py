"""Service schemas"""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from app.schemas.service_category import ServiceCategory
from app.schemas.animal_type import AnimalType
from app.schemas.animal_breed import AnimalBreed


class BusinessUserMinimal(BaseModel):
    """Minimal business user schema for service responses"""

    id: int
    first_name: str
    last_name: str
    email: str

    class Config:
        from_attributes = True


class ServiceBase(BaseModel):
    """Base service schema"""

    name: str = Field(..., max_length=255)
    description: str | None = None
    category_id: int
    duration_minutes: int = Field(..., gt=0)
    price: Decimal = Field(..., ge=0, decimal_places=2)
    tax_rate: Decimal | None = Field(None, ge=0, le=100, decimal_places=2)
    is_active: bool = True
    applies_to_all_animal_types: bool = True
    applies_to_all_breeds: bool = True


class ServiceCreate(ServiceBase):
    """Schema for creating a service"""

    staff_member_ids: list[int] = Field(default_factory=list)
    animal_type_ids: list[int] = Field(default_factory=list)
    animal_breed_ids: list[int] = Field(default_factory=list)


class ServiceUpdate(BaseModel):
    """Schema for updating a service"""

    name: str | None = Field(None, max_length=255)
    description: str | None = None
    category_id: int | None = None
    duration_minutes: int | None = Field(None, gt=0)
    price: Decimal | None = Field(None, ge=0, decimal_places=2)
    tax_rate: Decimal | None = Field(None, ge=0, le=100, decimal_places=2)
    is_active: bool | None = None
    applies_to_all_animal_types: bool | None = None
    applies_to_all_breeds: bool | None = None
    staff_member_ids: list[int] | None = None
    animal_type_ids: list[int] | None = None
    animal_breed_ids: list[int] | None = None


class Service(ServiceBase):
    """Service response schema with relationships"""

    id: int
    business_id: int
    category: ServiceCategory
    staff_members: list[BusinessUserMinimal] = []
    animal_types: list[AnimalType] = []
    animal_breeds: list[AnimalBreed] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
