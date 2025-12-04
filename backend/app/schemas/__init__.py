"""Schemas package"""

from app.schemas.business import Business, BusinessCreate, BusinessUpdate
from app.schemas.business_user import (
    BusinessUser,
    BusinessUserCreate,
    BusinessUserUpdate,
)
from app.schemas.animal_breed import AnimalBreed as AnimalBreedSchema
from app.schemas.service_category import (
    ServiceCategory,
    ServiceCategoryCreate,
)
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.schemas.customer_user import (
    CustomerUser,
    CustomerUserCreate,
    CustomerUserUpdate,
)
from app.schemas.pet import Pet, PetCreate, PetUpdate
from app.schemas.appointment import Appointment, AppointmentCreate, AppointmentUpdate
from app.schemas.note import Note, NoteCreate

__all__ = [
    "Business",
    "BusinessCreate",
    "BusinessUpdate",
    "BusinessUser",
    "BusinessUserCreate",
    "BusinessUserUpdate",
    "AnimalBreedSchema",
    "ServiceCategory",
    "ServiceCategoryCreate",
    "Customer",
    "CustomerCreate",
    "CustomerUpdate",
    "CustomerUser",
    "CustomerUserCreate",
    "CustomerUserUpdate",
    "Pet",
    "PetCreate",
    "PetUpdate",
    "Appointment",
    "AppointmentCreate",
    "AppointmentUpdate",
    "Note",
    "NoteCreate",
]
