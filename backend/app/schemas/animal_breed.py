"""Animal breed schemas"""

from datetime import datetime
from pydantic import BaseModel


class AnimalBreed(BaseModel):
    """Animal breed response schema"""

    id: int
    name: str
    animal_type_id: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
