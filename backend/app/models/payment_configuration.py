"""
Payment provider configuration model.

This module defines the PaymentConfiguration model for storing per-business
payment provider credentials and settings (OAuth tokens, API keys, etc.).
"""

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now():
    """Return current UTC time with timezone info."""
    return datetime.now(timezone.utc)


class PaymentProvider(str, Enum):
    """Supported payment providers."""

    SQUARE = "square"
    CLOVER = "clover"
    # Add more providers as needed


class PaymentConfiguration(Base):
    """
    Payment provider configuration for a business.

    Stores encrypted OAuth tokens, API credentials, and provider-specific
    settings for payment processing integrations.
    """

    __tablename__ = "payment_configurations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[PaymentProvider] = mapped_column(
        SQLEnum(PaymentProvider, name="payment_provider", create_type=True),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Encrypted credentials (OAuth tokens, API keys)
    # Stored as encrypted JSON string
    encrypted_credentials: Mapped[str] = mapped_column(Text, nullable=False)

    # Provider-specific settings (location_id, environment, etc.)
    settings: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="payment_configurations")
    payment_devices: Mapped[list["PaymentDevice"]] = relationship(
        "PaymentDevice", back_populates="configuration", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<PaymentConfiguration(id={self.id}, business_id={self.business_id}, provider={self.provider.value})>"
