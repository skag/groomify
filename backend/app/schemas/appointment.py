"""Appointment schemas"""

from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, Field, field_validator

from app.models.appointment import AppointmentStatusName


StatusLiteral = Literal[
    "scheduled",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
]


class AppointmentBase(BaseModel):
    """Base appointment schema"""

    appointment_datetime: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    status: StatusLiteral = Field(
        default=AppointmentStatusName.SCHEDULED.value,
        alias="status_name",
    )
    notes: str | None = None

    @field_validator("status", mode="before")
    @classmethod
    def _extract_status_name(cls, value):
        if value is None:
            return value
        if isinstance(value, str):
            return value
        return getattr(value, "name", value)

    class Config:
        populate_by_name = True


class AppointmentCreate(AppointmentBase):
    """Schema for creating an appointment"""

    business_id: int
    customer_id: int
    pet_id: int
    staff_id: int


class AppointmentUpdate(BaseModel):
    """Schema for updating an appointment"""

    appointment_datetime: datetime | None = None
    duration_minutes: int | None = Field(None, ge=15, le=480)
    status: StatusLiteral | None = None
    staff_id: int | None = None
    notes: str | None = None

    class Config:
        populate_by_name = True


class Appointment(AppointmentBase):
    """Schema for appointment response"""

    id: int
    business_id: int
    customer_id: int
    pet_id: int
    staff_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class AppointmentServiceSchema(BaseModel):
    """Service included in an appointment"""

    name: str
    price: float = 0  # Placeholder - will come from future transaction table


class CustomerAppointmentHistory(BaseModel):
    """Appointment history item for customer detail page"""

    id: int
    pet_name: str
    date: datetime
    end_time: datetime
    duration_minutes: int
    services: list[AppointmentServiceSchema]
    tip: float = 0  # Placeholder - will come from future transaction table
    amount: float = 0  # Placeholder - will come from future transaction table
    has_note: bool
    note: str | None = None


class DailyAppointmentItem(BaseModel):
    """Single appointment for the daily calendar view"""

    id: int
    time: str  # Formatted as "9:00 AM"
    end_time: str  # Formatted as "10:30 AM"
    pet_name: str
    owner: str  # Customer account_name
    service: str  # Primary service name (first in list)
    groomer: str  # Staff member full name
    groomer_id: int
    tags: list[str] = []  # Pet behavioral tags (empty for now)
    status: StatusLiteral | None = None


class GroomerWithAppointments(BaseModel):
    """Groomer with their appointments for the day"""

    id: int
    name: str  # Full name (first_name + " " + last_name)
    appointments: list[DailyAppointmentItem] = []


class DailyAppointmentsResponse(BaseModel):
    """Response for daily appointments endpoint"""

    date: date
    total_appointments: int
    groomers: list[GroomerWithAppointments]
