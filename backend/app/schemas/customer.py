"""Customer schemas"""

from datetime import datetime, date
from pydantic import BaseModel, Field

from app.schemas.note import Note
from app.schemas.customer_user import CustomerUser, CustomerUserBase
from app.schemas.pet import Pet


class CustomerBase(BaseModel):
    """Base customer schema"""

    account_name: str = Field(..., max_length=255)
    status: str = Field(default="active", max_length=50)


class CustomerCreate(CustomerBase):
    """Schema for creating a customer"""

    business_id: int


class CustomerUpdate(BaseModel):
    """Schema for updating a customer"""

    account_name: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=50)
    address_line1: str | None = Field(None, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)


class Customer(CustomerBase):
    """Schema for customer response"""

    id: int
    business_id: int
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    country: str | None = None
    postal_code: str | None = None
    notes: list[Note] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerWithRelations(Customer):
    """Customer response with nested customer_users and pets"""

    customer_users: list[CustomerUser] = Field(default_factory=list)
    pets: list[Pet] = Field(default_factory=list)


# Schema for creating customer with user and pet in one request
class CustomerUserCreateInput(BaseModel):
    """Customer user data for creating with customer"""

    email: str = Field(..., max_length=255)
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: str | None = Field(None, max_length=20)


class PetCreateInput(BaseModel):
    """Pet data for creating with customer"""

    name: str = Field(..., max_length=100)
    animal_type_id: int
    breed_id: int | None = None
    birth_date: date | None = None
    weight: float | None = None
    spayed_neutered: bool = False


class CustomerCreateWithRelations(BaseModel):
    """Schema for creating customer with customer_user and pet"""

    customer_user: CustomerUserCreateInput
    pet: PetCreateInput
    # Optional address fields
    address_line1: str | None = Field(None, max_length=255)
    address_line2: str | None = Field(None, max_length=255)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    postal_code: str | None = Field(None, max_length=20)
