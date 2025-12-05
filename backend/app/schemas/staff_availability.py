"""Staff availability schemas"""

from datetime import time
from pydantic import BaseModel, Field


class StaffAvailabilityBase(BaseModel):
    """Base staff availability schema"""

    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    is_available: bool = True
    start_time: time | None = None
    end_time: time | None = None


class StaffAvailabilityCreate(StaffAvailabilityBase):
    """Schema for creating staff availability"""

    pass


class StaffAvailabilityUpdate(BaseModel):
    """Schema for updating a single availability entry"""

    is_available: bool | None = None
    start_time: time | None = None
    end_time: time | None = None


class StaffAvailability(StaffAvailabilityBase):
    """Schema for staff availability response"""

    id: int
    business_user_id: int

    class Config:
        from_attributes = True


class StaffAvailabilityBulkUpdate(BaseModel):
    """Schema for updating all 7 days at once"""

    availability: list[StaffAvailabilityCreate] = Field(
        ..., min_length=7, max_length=7, description="Availability for all 7 days"
    )
