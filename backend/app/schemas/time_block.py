"""Time block schemas"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class BlockReason(str, Enum):
    """Block reason enum matching frontend BLOCK_REASONS constants"""

    LUNCH = "lunch"
    MEETING = "meeting"
    PERSONAL = "personal"
    TRAINING = "training"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    VACATION = "vacation"
    SICK = "sick"
    OTHER = "other"


# Human-readable labels for each reason (matching frontend)
BLOCK_REASON_LABELS = {
    "lunch": "Lunch Break",
    "meeting": "Meeting",
    "personal": "Personal Time",
    "training": "Training",
    "cleaning": "Equipment Cleaning",
    "maintenance": "Maintenance",
    "vacation": "Vacation",
    "sick": "Sick Leave",
    "other": "Other",
}


class TimeBlockCreate(BaseModel):
    """Schema for creating a time block"""

    staff_id: int
    block_datetime: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    reason: BlockReason
    description: str | None = None


class TimeBlockUpdate(BaseModel):
    """Schema for updating a time block"""

    block_datetime: datetime | None = None
    duration_minutes: int | None = Field(None, ge=15, le=480)
    reason: BlockReason | None = None
    description: str | None = None


class TimeBlockResponse(BaseModel):
    """Response schema for a time block"""

    id: int
    business_id: int
    staff_id: int
    staff_name: str
    block_datetime: datetime
    duration_minutes: int
    reason: str
    reason_label: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime
    has_conflict: bool = False
    conflict_message: str | None = None

    class Config:
        from_attributes = True


class DailyTimeBlockItem(BaseModel):
    """Time block item for daily calendar view"""

    id: int
    time: str  # Formatted as "9:00 AM"
    end_time: str  # Formatted as "10:30 AM"
    reason: str
    reason_label: str  # Human-readable label
    description: str | None = None
    groomer_id: int
    is_block: bool = True  # Discriminator for frontend
