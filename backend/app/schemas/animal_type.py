"""Animal type schemas"""

from datetime import datetime
from pydantic import BaseModel

from app.schemas.animal_breed import AnimalBreed


class AnimalTypeBase(BaseModel):
    """Base animal type schema"""

    name: str


class AnimalType(AnimalTypeBase):
    """Animal type response schema"""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AnimalTypeWithBreeds(AnimalType):
    """Animal type with breeds response schema"""

    breeds: list[AnimalBreed] = []

    class Config:
        from_attributes = True
