"""Appointment schemas"""

from datetime import datetime
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
        allow_population_by_field_name = True


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
        allow_population_by_field_name = True


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
        allow_population_by_field_name = True
