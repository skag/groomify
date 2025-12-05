"""
Payment device model.

This module defines the PaymentDevice model for managing physical payment
terminals (Square Terminal, Clover devices, etc.) paired to a business.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now():
    """Return current UTC time with timezone info."""
    return datetime.now(timezone.utc)


class PaymentDevice(Base):
    """
    Physical payment terminal device paired to a business.

    Supports multiple terminals per business. All staff members can use any device.
    """

    __tablename__ = "payment_devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    configuration_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("payment_configurations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Provider-specific device identifier (e.g., Square device ID)
    device_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Human-readable device name (e.g., "Front Desk Terminal", "Mobile Terminal 1")
    device_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Provider location ID (e.g., Square location ID)
    location_id: Mapped[str] = mapped_column(String(255), nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Temporary pairing code (cleared after successful pairing)
    pairing_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Timestamps
    paired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Provider-specific device metadata (device model, serial number, etc.)
    device_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="payment_devices")
    configuration: Mapped["PaymentConfiguration"] = relationship(
        "PaymentConfiguration", back_populates="payment_devices"
    )

    def __repr__(self) -> str:
        return f"<PaymentDevice(id={self.id}, device_id={self.device_id}, device_name={self.device_name})>"
