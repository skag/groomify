"""Pet schemas"""

from datetime import datetime, date
from pydantic import BaseModel, Field

from app.schemas.note import Note


class PetBase(BaseModel):
    """Base pet schema"""

    name: str = Field(..., max_length=100)
    species: str = Field(..., max_length=50)
    breed: str | None = Field(None, max_length=100)
    age: int | None = None
    weight: float | None = None
    special_notes: str | None = None
    default_groomer_id: int | None = None


class PetCreate(PetBase):
    """Schema for creating a pet"""

    customer_id: int
    business_id: int


class PetAdd(BaseModel):
    """Schema for adding a pet to existing customer"""

    name: str = Field(..., max_length=100)
    animal_type_id: int
    breed_id: int | None = None
    birth_date: date | None = None
    weight: float | None = None
    spayed_neutered: bool = False


class PetUpdate(BaseModel):
    """Schema for updating a pet"""

    name: str | None = Field(None, max_length=100)
    species: str | None = Field(None, max_length=50)
    breed: str | None = Field(None, max_length=100)
    age: int | None = None
    weight: float | None = None
    special_notes: str | None = None
    default_groomer_id: int | None = None


class Pet(PetBase):
    """Schema for pet response"""

    id: int
    customer_id: int
    business_id: int
    notes: list[Note] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PetWithCustomer(Pet):
    """Schema for pet response with customer information"""

    account_name: str = ""  # Customer account name

    class Config:
        from_attributes = True


class PetSearchResult(BaseModel):
    """Schema for pet search results with denormalized display data"""

    pet_id: int
    pet_name: str
    family_name: str  # customer.account_name
    phone: str | None  # primary contact's phone
    customer_user_name: str  # primary contact's full name
    species: str
    breed: str | None

    class Config:
        from_attributes = True
