"""
Payment model for tracking financial transactions
"""

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    String,
    Integer,
    ForeignKey,
    Numeric,
    DateTime,
    JSON,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Payment(Base):
    """
    Payments table - tracks individual financial transactions

    This table records the actual payment processing events. It's separate from
    orders to support flexible payment scenarios like deposits, partial payments,
    invoices, and refunds.

    Key design decisions:
    - order_id is nullable to support payments without orders (deposits, invoices)
    - Square-specific fields (square_checkout_id, square_payment_id) track external state
    - payment_metadata stores flexible JSON for provider-specific data
    - Status transitions: pending → completed/failed/cancelled
    """
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign Keys
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    payment_device_id: Mapped[int | None] = mapped_column(
        ForeignKey("payment_devices.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    processed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("business_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Payment Details
    # payment_type: charge, refund, partial_refund, deposit
    payment_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="charge"
    )

    # payment_method: square_terminal, square_card, cash, check, other
    payment_method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="square_terminal"
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    tip_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )

    # status: pending, completed, failed, cancelled, refunded
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
        index=True
    )

    # Square-specific fields
    square_checkout_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
        unique=True  # Each checkout is unique
    )
    square_payment_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True
    )
    square_receipt_url: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True
    )

    # Flexible metadata for provider-specific data
    payment_metadata: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True
    )

    # Error tracking
    error_code: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    failed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # Relationships
    order: Mapped["Order | None"] = relationship(
        "Order",
        back_populates="payments"
    )
    business: Mapped["Business"] = relationship("Business")
    payment_device: Mapped["PaymentDevice | None"] = relationship("PaymentDevice")
    processed_by: Mapped["BusinessUser | None"] = relationship(
        "BusinessUser",
        foreign_keys=[processed_by_id]
    )

    __table_args__ = (
        Index("idx_payments_business_status", "business_id", "status"),
        Index("idx_payments_business_created", "business_id", "created_at"),
        Index("idx_payments_order_status", "order_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<Payment {self.id} - {self.status} - ${self.amount}>"
