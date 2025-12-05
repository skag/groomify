"""
Order schemas for request/response validation
"""

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class OrderBase(BaseModel):
    """Base order schema"""
    order_type: str = Field(default="appointment")
    subtotal: Decimal = Field(ge=0, decimal_places=2)
    tax: Decimal = Field(ge=0, decimal_places=2, default=Decimal("0.00"))
    tip: Decimal = Field(ge=0, decimal_places=2, default=Decimal("0.00"))
    total: Decimal = Field(ge=0, decimal_places=2)
    discount_type: str | None = None
    discount_value: Decimal | None = Field(None, ge=0, decimal_places=2)
    discount_amount: Decimal = Field(ge=0, decimal_places=2, default=Decimal("0.00"))


class OrderCreate(BaseModel):
    """Create order from appointment"""
    appointment_id: int = Field(gt=0)
    tax_rate: Decimal = Field(ge=0, le=1, decimal_places=4, default=Decimal("0.00"))


class OrderResponse(OrderBase):
    """Order response schema"""
    id: int
    business_id: int
    customer_id: int | None
    pet_id: int | None
    appointment_id: int | None
    groomer_id: int | None
    picked_up_by_id: int | None
    service_id: int | None
    order_number: str
    service_title: str
    groomer_name: str
    pet_name: str
    order_status: str
    payment_status: str
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class OrderUpdatePaymentStatus(BaseModel):
    """Update order payment status"""
    payment_status: str = Field(
        pattern="^(unpaid|pending|paid|partially_paid|refunded|failed)$"
    )


class OrderUpdateDiscount(BaseModel):
    """Update order discount"""
    discount_type: str | None = Field(None, pattern="^(percentage|dollar)$")
    discount_value: Decimal | None = Field(None, ge=0, decimal_places=2)
