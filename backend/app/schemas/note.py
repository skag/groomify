"""Note schema for JSON notes field"""

from datetime import datetime
from pydantic import BaseModel


class Note(BaseModel):
    """Schema for a single note in the notes JSON array"""

    date: datetime
    note: str
    created_by_id: int  # FK to business_users.id


class NoteCreate(BaseModel):
    """Schema for creating a note"""

    note: str
    created_by_id: int
