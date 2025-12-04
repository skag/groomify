"""Appointment model"""

from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey, Table, Column, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AppointmentStatus(Base):
    """Lookup table for appointment statuses"""

    __tablename__ = "appointment_statuses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    display_text: Mapped[str] = mapped_column(String(100), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<AppointmentStatus(id={self.id}, name='{self.name}', display_text='{self.display_text}', order={self.order})>"


class Appointment(Base):
    """Appointment for pet grooming service"""

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pet_id: Mapped[int] = mapped_column(
        ForeignKey("pets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    staff_id: Mapped[int] = mapped_column(
        ForeignKey("business_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    status_id: Mapped[int] = mapped_column(
        ForeignKey("appointment_statuses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    is_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    status: Mapped["AppointmentStatus"] = relationship()
    business: Mapped["Business"] = relationship(back_populates="appointments")
    customer: Mapped["Customer"] = relationship(back_populates="appointments")
    pet: Mapped["Pet"] = relationship(back_populates="appointments")
    staff_member: Mapped["BusinessUser"] = relationship(
        back_populates="appointments", foreign_keys=[staff_id]
    )
    services: Mapped[list["Service"]] = relationship(
        secondary="appointment_services", back_populates="appointments"
    )

    @property
    def status_name(self) -> str | None:
        return self.status.name if self.status else None

    def __repr__(self) -> str:
        return f"<Appointment(id={self.id}, pet_id={self.pet_id}, datetime='{self.appointment_datetime}', status='{self.status_name}')>"


# Association table for Appointment to Service (many-to-many)
appointment_services = Table(
    "appointment_services",
    Base.metadata,
    Column("appointment_id", ForeignKey("appointments.id", ondelete="CASCADE"), primary_key=True),
    Column("service_id", ForeignKey("services.id", ondelete="RESTRICT"), primary_key=True),
)
