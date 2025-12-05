"""Appointment schemas"""

from datetime import datetime, date
from pydantic import BaseModel, Field, field_validator


class AppointmentStatusResponse(BaseModel):
    """Response schema for appointment status (for kanban column configuration)"""

    id: int
    name: str
    display_text: str
    order: int

    class Config:
        from_attributes = True


class AppointmentBase(BaseModel):
    """Base appointment schema"""

    appointment_datetime: datetime
    duration_minutes: int = Field(default=60, ge=15, le=480)
    status: str = Field(
        default="scheduled",
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
    status: str | None = None
    staff_id: int | None = None
    notes: str | None = None

    class Config:
        populate_by_name = True


class UpdateAppointmentRequest(BaseModel):
    """Request schema for updating an appointment from calendar"""

    staff_id: int | None = None
    service_ids: list[int] | None = None
    appointment_datetime: datetime | None = None
    duration_minutes: int | None = Field(None, ge=15, le=480)
    notes: str | None = None
    status: str | None = None
    is_confirmed: bool | None = None


class UpdateAppointmentResponse(BaseModel):
    """Response schema for updated appointment"""

    id: int
    pet_id: int
    pet_name: str
    customer_id: int
    customer_name: str
    staff_id: int
    staff_name: str
    appointment_datetime: datetime
    duration_minutes: int
    services: list["AppointmentServiceSchema"]
    status: str
    is_confirmed: bool
    notes: str | None = None

    class Config:
        from_attributes = True


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
    """Single item for the daily calendar view (appointment or time block)"""

    id: int
    time: str  # Formatted as "9:00 AM"
    end_time: str  # Formatted as "10:30 AM"
    groomer: str  # Staff member full name
    groomer_id: int
    is_block: bool = False  # Discriminator: False for appointments, True for blocks

    # Appointment-specific fields (optional when is_block=True)
    pet_id: int | None = None
    pet_name: str | None = None
    owner: str | None = None  # Customer account_name
    service_id: int | None = None  # Primary service ID (first in list)
    service: str | None = None  # Primary service name (first in list)
    tags: list[str] = []  # Pet behavioral tags (empty for now)
    status: str | None = None
    is_confirmed: bool | None = None
    notes: str | None = None

    # Block-specific fields (optional when is_block=False)
    block_reason: str | None = None
    block_reason_label: str | None = None
    block_description: str | None = None


class GroomerWithAppointments(BaseModel):
    """Groomer with their appointments for the day"""

    id: int
    name: str  # Full name (first_name + " " + last_name)
    appointments: list[DailyAppointmentItem] = []


class DailyAppointmentsResponse(BaseModel):
    """Response for daily appointments endpoint"""

    date: date
    total_appointments: int
    total_blocks: int = 0
    groomers: list[GroomerWithAppointments]


class CreateAppointmentRequest(BaseModel):
    """Request schema for creating an appointment from calendar"""

    pet_id: int
    staff_id: int
    service_ids: list[int] = Field(default_factory=list)
    appointment_datetime: datetime
    duration_minutes: int = Field(ge=15, le=480)
    notes: str | None = None


class CreateAppointmentResponse(BaseModel):
    """Response schema for created appointment"""

    id: int
    pet_id: int
    pet_name: str
    customer_id: int
    customer_name: str
    staff_id: int
    staff_name: str
    appointment_datetime: datetime
    duration_minutes: int
    services: list[AppointmentServiceSchema]
    status: str
    is_confirmed: bool
    notes: str | None = None

    class Config:
        from_attributes = True
