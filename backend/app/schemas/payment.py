"""
Payment-related Pydantic schemas.

This module defines request/response schemas for payment provider
configuration, OAuth flows, and device pairing.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.payment_configuration import PaymentProvider


# OAuth Schemas


class OAuthAuthorizeResponse(BaseModel):
    """Response for OAuth authorization URL generation."""

    authorization_url: str = Field(..., description="URL to redirect user for OAuth authorization")
    state: str = Field(..., description="CSRF state parameter for validation")


class OAuthCallbackRequest(BaseModel):
    """Request for OAuth callback handling."""

    code: str = Field(..., description="Authorization code from OAuth provider")
    state: str = Field(..., description="CSRF state parameter for validation")


class OAuthDisconnectResponse(BaseModel):
    """Response for OAuth disconnection."""

    success: bool = Field(..., description="Whether disconnection was successful")
    message: str = Field(..., description="Human-readable status message")


# Payment Configuration Schemas


class PaymentConfigurationBase(BaseModel):
    """Base payment configuration schema."""

    provider: PaymentProvider = Field(..., description="Payment provider type")
    is_active: bool = Field(True, description="Whether this configuration is active")
    settings: dict[str, Any] | None = Field(None, description="Provider-specific settings")


class PaymentConfigurationResponse(PaymentConfigurationBase):
    """Payment configuration response schema."""

    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime
    has_credentials: bool = Field(..., description="Whether OAuth credentials are configured")
    location_id: str | None = Field(None, description="Primary location ID for this provider")

    model_config = {"from_attributes": True}


# Device Pairing Schemas


class DevicePairingRequest(BaseModel):
    """Request to initiate device pairing."""

    device_name: str = Field(..., description="Human-readable device name", min_length=1, max_length=255)
    location_id: str | None = Field(None, description="Square location ID (optional, uses default if not provided)")


class DevicePairingResponse(BaseModel):
    """Response for device pairing initiation."""

    pairing_code: str = Field(..., description="Code to enter on the physical device")
    device_id: str = Field(..., description="Device ID for tracking pairing status")
    expires_at: datetime | None = Field(None, description="When the pairing code expires")
    status: str = Field(..., description="Pairing status (PENDING, PAIRED, FAILED)")


class DevicePairingStatusRequest(BaseModel):
    """Request to check device pairing status."""

    device_code_id: str = Field(..., description="Device code ID from pairing initiation")


class DevicePairingStatusResponse(BaseModel):
    """Response for device pairing status check."""

    status: str = Field(..., description="Pairing status (PENDING, PAIRED, FAILED)")
    device_id: str | None = Field(None, description="Device ID if paired successfully")


class PaymentDeviceCreate(BaseModel):
    """Schema for creating a payment device (after pairing)."""

    device_id: str = Field(..., description="Provider device ID")
    device_name: str = Field(..., description="Human-readable device name")
    location_id: str = Field(..., description="Provider location ID")
    pairing_code: str | None = Field(None, description="Pairing code used")
    device_metadata: dict[str, Any] | None = Field(None, description="Provider-specific device metadata")


class PaymentDeviceUpdate(BaseModel):
    """Schema for updating a payment device."""

    device_name: str | None = Field(None, description="Update device name")
    is_active: bool | None = Field(None, description="Activate or deactivate device")


class PaymentDeviceResponse(BaseModel):
    """Payment device response schema."""

    id: int
    business_id: int
    device_id: str
    device_name: str
    location_id: str
    is_active: bool
    paired_at: datetime
    last_used_at: datetime | None
    created_at: datetime
    updated_at: datetime
    device_metadata: dict[str, Any] | None
    provider: PaymentProvider = Field(..., description="Payment provider type")

    model_config = {"from_attributes": True}


# Test Mode Schemas


class TestDeviceRequest(BaseModel):
    """Request to pair a test device (sandbox only)."""

    device_name: str = Field(..., description="Human-readable device name")
    test_device_id: str = Field(
        ...,
        description="Square sandbox test device ID (e.g., READER_SIMULATOR)",
    )
    location_id: str | None = Field(None, description="Square location ID")


class TestDeviceResponse(BaseModel):
    """Response for test device pairing."""

    success: bool
    device: PaymentDeviceResponse | None = Field(None, description="Created device if successful")
    message: str


# Payment Processing Schemas


class PaymentBase(BaseModel):
    """Base payment schema"""
    amount: float = Field(ge=0, description="Payment amount")
    payment_type: str = Field(default="charge", description="Payment type")
    payment_method: str = Field(default="square_terminal", description="Payment method")


class InitiateTerminalPaymentRequest(BaseModel):
    """Request to initiate terminal payment"""
    order_id: int = Field(gt=0, description="Order ID to pay for")
    payment_device_id: int = Field(gt=0, description="Payment device ID to use")


class InitiateTerminalPaymentResponse(BaseModel):
    """Response from initiating terminal payment"""
    payment_id: int
    square_checkout_id: str
    status: str
    amount: float
    order_number: str


class PaymentStatusResponse(BaseModel):
    """Payment status response"""
    payment_id: int
    status: str
    square_status: str | None
    payment_status: str | None  # Order payment status
    tip_money: Any | None
    total_money: Any | None
    receipt_url: str | None


class PaymentResponse(PaymentBase):
    """Payment response schema"""
    id: int
    business_id: int
    order_id: int | None
    payment_device_id: int | None
    processed_by_id: int | None
    status: str
    square_checkout_id: str | None
    square_payment_id: str | None
    square_receipt_url: str | None
    payment_metadata: dict[str, Any] | None
    error_code: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    failed_at: datetime | None
    cancelled_at: datetime | None

    model_config = {"from_attributes": True}
