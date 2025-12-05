"""
Order model for tracking business orders
"""

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import (
    String,
    Integer,
    ForeignKey,
    Numeric,
    DateTime,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Order(Base):
    """
    Orders table - tracks business orders from appointments, walk-ins, etc.

    This is the primary business record that tracks what service was performed,
    for which customer/pet, by which groomer, and the financial totals.

    Key design decisions:
    - payment_status is the single source of truth for payment state
    - Foreign keys are nullable to preserve historical data if records are deleted
    - Denormalized fields (service_title, groomer_name, pet_name) preserve historical accuracy
    - appointment_id is unique because each appointment can only have one order
    """
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign Keys - All nullable to preserve historical data
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    pet_id: Mapped[int | None] = mapped_column(
        ForeignKey("pets.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        unique=True  # One order per appointment
    )
    groomer_id: Mapped[int | None] = mapped_column(
        ForeignKey("business_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    picked_up_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("customer_users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("services.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Order Details
    order_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="appointment"
    )
    order_number: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True
    )

    # Financial Fields - All in USD
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )
    tax: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )
    tip: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )
    total: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False
    )

    # Discount Information
    discount_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )  # "percentage" or "dollar"
    discount_value: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True
    )  # The discount value entered by user (e.g., 15 for 15% or $15)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )  # Calculated discount amount in dollars

    # Denormalized Data - Preserves historical accuracy
    service_title: Mapped[str] = mapped_column(
        String(500),
        nullable=False
    )
    groomer_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    pet_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # Status Fields
    # order_status: pending, in_progress, completed, cancelled
    order_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
        index=True
    )

    # CRITICAL: payment_status is the single source of truth
    # Values: unpaid, pending, paid, partially_paid, refunded, failed
    payment_status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="unpaid",
        index=True
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

    # Relationships
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="order",
        cascade="all, delete-orphan"
    )
    business: Mapped["Business"] = relationship("Business")
    customer: Mapped["Customer | None"] = relationship("Customer")
    pet: Mapped["Pet | None"] = relationship("Pet")
    appointment: Mapped["Appointment | None"] = relationship("Appointment")
    groomer: Mapped["BusinessUser | None"] = relationship(
        "BusinessUser",
        foreign_keys=[groomer_id]
    )
    picked_up_by: Mapped["CustomerUser | None"] = relationship(
        "CustomerUser",
        foreign_keys=[picked_up_by_id]
    )
    service: Mapped["Service | None"] = relationship("Service")

    __table_args__ = (
        Index("idx_orders_business_payment_status", "business_id", "payment_status"),
        Index("idx_orders_business_order_status", "business_id", "order_status"),
        Index("idx_orders_business_created", "business_id", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Order {self.order_number} - {self.payment_status}>"
