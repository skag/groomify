"""
Payment API endpoints.

This module provides REST endpoints for payment provider configuration,
OAuth flows, and device pairing management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import BusinessId, OwnerUser, OwnerOrStaffUser, require_owner, require_owner_or_staff
from app.core.dependencies import AuthenticatedUser
from app.core.logger import get_logger
from app.models.payment_configuration import PaymentProvider
from app.schemas.payment import (
    OAuthAuthorizeResponse,
    OAuthCallbackRequest,
    OAuthDisconnectResponse,
    PaymentConfigurationResponse,
    DevicePairingRequest,
    DevicePairingResponse,
    DevicePairingStatusRequest,
    DevicePairingStatusResponse,
    PaymentDeviceResponse,
    PaymentDeviceUpdate,
    TestDeviceRequest,
    TestDeviceResponse,
    InitiateTerminalPaymentRequest,
    InitiateTerminalPaymentResponse,
    PaymentStatusResponse,
)
from app.schemas.order import OrderCreate, OrderResponse, OrderUpdateDiscount
from app.services import payment_service
from app.services.payment_service import PaymentServiceError
from app.services.order_service import OrderService
from app.services.payment_processing_service import PaymentProcessingService

logger = get_logger("app.api.payments")

router = APIRouter(prefix="/payments", tags=["Payments"])


# OAuth Endpoints


@router.get(
    "/oauth/authorize",
    response_model=OAuthAuthorizeResponse,
    summary="Get OAuth authorization URL",
    description="Generate OAuth authorization URL for Square. Owner only.",
)
def get_oauth_authorization_url(
    current_user: OwnerUser,
    db: Session = Depends(get_db),
    provider: str = Query("square", description="Payment provider"),
) -> OAuthAuthorizeResponse:
    """Get OAuth authorization URL for a payment provider."""
    business_id = current_user.business_id
    try:
        # Generate state for CSRF protection
        logger.info(f"Generating OAuth state for provider: {provider}")
        state = payment_service.generate_oauth_state()
        logger.info(f"Generated state: {state[:10]}...")

        # Get authorization URL based on provider
        if provider == "square":
            from app.services.providers.square_provider import SquarePaymentProvider

            logger.info(f"Creating Square provider with environment: {settings.SQUARE_ENVIRONMENT}")
            square_provider = SquarePaymentProvider(
                credentials={},
                provider_settings={"environment": settings.SQUARE_ENVIRONMENT},
            )
            logger.info("Square provider created, getting authorization URL")
            auth_url = square_provider.get_oauth_authorization_url(
                state=state, redirect_uri=settings.SQUARE_REDIRECT_URI
            )
            logger.info(f"Got authorization URL: {auth_url[:50]}...")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Provider {provider} not supported yet",
            )

        # TODO: Store state in session/cache for validation in callback
        # For now, we'll return it and expect frontend to send it back

        return OAuthAuthorizeResponse(authorization_url=auth_url, state=state)

    except Exception as e:
        import traceback
        logger.error(f"Failed to generate OAuth URL: {e}")
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}",
        )


@router.get(
    "/oauth/callback",
    summary="OAuth callback redirect",
    description="Handle OAuth callback from provider and redirect to frontend.",
)
def oauth_callback_redirect(
    code: str = Query(..., description="Authorization code from provider"),
    state: str = Query(..., description="CSRF state parameter"),
    provider: str = Query("square", description="Payment provider"),
):
    """Handle OAuth callback from provider and redirect to frontend with code."""
    from fastapi.responses import RedirectResponse

    # Redirect to frontend with code and state
    frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
    redirect_url = f"{frontend_url}/settings/integrations?code={code}&state={state}&provider={provider}"

    logger.info(f"OAuth callback received, redirecting to: {redirect_url}")
    return RedirectResponse(url=redirect_url)


@router.post(
    "/oauth/callback",
    response_model=PaymentConfigurationResponse,
    summary="Process OAuth callback",
    description="Exchange authorization code for tokens and store credentials. Owner only.",
)
def handle_oauth_callback(
    callback_data: OAuthCallbackRequest,
    current_user: OwnerUser,
    db: Session = Depends(get_db),
    provider: str = Query("square", description="Payment provider"),
)-> PaymentConfigurationResponse:
    """Exchange authorization code for access tokens."""
    business_id = current_user.business_id
    try:
        # TODO: Validate state parameter against stored state

        # Convert provider string to enum
        provider_enum = PaymentProvider(provider)

        # Exchange code for tokens based on provider
        if provider == "square":
            from app.services.providers.square_provider import SquarePaymentProvider

            square_provider = SquarePaymentProvider(
                credentials={},
                provider_settings={"environment": settings.SQUARE_ENVIRONMENT},
            )
            credentials = square_provider.exchange_authorization_code(
                code=callback_data.code, redirect_uri=settings.SQUARE_REDIRECT_URI
            )

            # Get merchant's locations to extract primary location
            locations = square_provider.get_locations()
            primary_location_id = locations[0]["location_id"] if locations else None

            # Store configuration
            config = payment_service.create_or_update_payment_configuration(
                db=db,
                business_id=business_id,
                provider=provider_enum,
                credentials=credentials,
                settings={
                    "environment": settings.SQUARE_ENVIRONMENT,
                    "location_id": primary_location_id,
                    "merchant_id": credentials.get("merchant_id"),
                },
            )

            return PaymentConfigurationResponse(
                id=config.id,
                business_id=config.business_id,
                provider=config.provider,
                is_active=config.is_active,
                settings=config.settings,
                created_at=config.created_at,
                updated_at=config.updated_at,
                has_credentials=True,
                location_id=primary_location_id,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Provider {provider} not supported yet",
            )

    except PaymentServiceError as e:
        logger.error(f"Payment service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to handle OAuth callback: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process OAuth callback: {str(e)}",
        )


@router.delete(
    "/oauth/disconnect",
    response_model=OAuthDisconnectResponse,
    summary="Disconnect OAuth",
    description="Revoke OAuth access and delete payment configuration. Owner only.",
)
def disconnect_oauth(
    current_user: OwnerUser,
    db: Session = Depends(get_db),
    provider: str = Query("square", description="Payment provider"),
) -> OAuthDisconnectResponse:
    """Disconnect OAuth and remove payment configuration."""
    business_id = current_user.business_id
    try:
        # Convert provider string to enum
        provider_enum = PaymentProvider(provider)

        deleted = payment_service.delete_payment_configuration(
            db=db, business_id=business_id, provider=provider_enum
        )

        if deleted:
            return OAuthDisconnectResponse(
                success=True, message="Payment provider disconnected successfully"
            )
        else:
            return OAuthDisconnectResponse(
                success=False, message="No active configuration found"
            )

    except Exception as e:
        logger.error(f"Failed to disconnect OAuth: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect: {str(e)}",
        )


@router.get(
    "/config",
    response_model=PaymentConfigurationResponse | None,
    summary="Get payment configuration",
    description="Get current payment configuration for business. Owner/Staff can view.",
)
def get_payment_config(
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> PaymentConfigurationResponse | None:
    """Get payment configuration."""
    business_id = current_user.business_id
    try:
        config = payment_service.get_payment_configuration(db=db, business_id=business_id)

        if not config:
            return None

        return PaymentConfigurationResponse(
            id=config.id,
            business_id=config.business_id,
            provider=config.provider,
            is_active=config.is_active,
            settings=config.settings,
            created_at=config.created_at,
            updated_at=config.updated_at,
            has_credentials=bool(config.encrypted_credentials),
            location_id=config.settings.get("location_id") if config.settings else None,
        )

    except Exception as e:
        logger.error(f"Failed to get payment config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get configuration: {str(e)}",
        )


# Device Pairing Endpoints


@router.post(
    "/devices/pair",
    response_model=DevicePairingResponse,
    summary="Initiate device pairing",
    description="Create a device code for terminal pairing. Owner/Staff can pair devices.",
)
def initiate_device_pairing(
    pairing_request: DevicePairingRequest,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> DevicePairingResponse:
    """Initiate device pairing by creating a device code."""
    business_id = current_user.business_id
    try:
        # Get payment provider
        provider = payment_service.get_payment_provider(db=db, business_id=business_id)

        # Use provided location_id or get from config
        config = payment_service.get_payment_configuration(db=db, business_id=business_id)
        location_id = pairing_request.location_id or (
            config.settings.get("location_id") if config and config.settings else None
        )

        if not location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="location_id is required. Provide it in request or configure in settings.",
            )

        # Create device code
        device_code_data = provider.create_device_code(
            device_name=pairing_request.device_name, location_id=location_id
        )

        return DevicePairingResponse(
            pairing_code=device_code_data["code"],
            device_id=device_code_data["device_code_id"],
            expires_at=device_code_data.get("expires_at"),
            status=device_code_data.get("status", "PENDING"),
        )

    except PaymentServiceError as e:
        logger.error(f"Payment service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to initiate device pairing: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create device code: {str(e)}",
        )


@router.post(
    "/devices/pair/status",
    response_model=DevicePairingStatusResponse,
    summary="Check device pairing status",
    description="Poll device code status to check if device has been paired. Owner/Staff can check status.",
)
def check_device_pairing_status(
    status_request: DevicePairingStatusRequest,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> DevicePairingStatusResponse:
    """Check the status of a device pairing attempt."""
    business_id = current_user.business_id
    try:
        # Get payment provider
        provider = payment_service.get_payment_provider(db=db, business_id=business_id)

        # Check device code status
        status_data = provider.get_device_code_status(
            device_code_id=status_request.device_code_id
        )

        # If paired, save the device
        if status_data["status"] == "PAIRED" and status_data.get("device_id"):
            # Check if device already exists
            existing_devices = payment_service.list_payment_devices(
                db=db, business_id=business_id
            )
            device_exists = any(
                d.device_id == status_data["device_id"] for d in existing_devices
            )

            if not device_exists:
                # Get device info
                device_info = provider.get_device_info(status_data["device_id"])

                # Get config to extract location_id
                config = payment_service.get_payment_configuration(
                    db=db, business_id=business_id
                )
                location_id = config.settings.get("location_id") if config and config.settings else device_info.get("location_id")

                # Create device record
                payment_service.create_payment_device(
                    db=db,
                    business_id=business_id,
                    device_data={
                        "device_id": status_data["device_id"],
                        "device_name": device_info.get("name", "Square Terminal"),
                        "location_id": location_id,
                        "pairing_code": status_data.get("code"),
                        "device_metadata": device_info,
                    },
                )

        return DevicePairingStatusResponse(
            status=status_data["status"], device_id=status_data.get("device_id")
        )

    except PaymentServiceError as e:
        logger.error(f"Payment service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to check device pairing status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check pairing status: {str(e)}",
        )


@router.get(
    "/devices",
    response_model=list[PaymentDeviceResponse],
    summary="List payment devices",
    description="Get all paired payment devices for business. Owner/Staff can view.",
)
def list_devices(
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> list[PaymentDeviceResponse]:
    """List all payment devices."""
    business_id = current_user.business_id
    try:
        devices = payment_service.list_payment_devices(db=db, business_id=business_id)

        # Get config to add provider info
        config = payment_service.get_payment_configuration(db=db, business_id=business_id)
        provider = config.provider if config else PaymentProvider.SQUARE

        return [
            PaymentDeviceResponse(
                id=device.id,
                business_id=device.business_id,
                device_id=device.device_id,
                device_name=device.device_name,
                location_id=device.location_id,
                is_active=device.is_active,
                paired_at=device.paired_at,
                last_used_at=device.last_used_at,
                created_at=device.created_at,
                updated_at=device.updated_at,
                device_metadata=device.device_metadata,
                provider=provider,
            )
            for device in devices
        ]

    except Exception as e:
        logger.error(f"Failed to list devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list devices: {str(e)}",
        )


@router.patch(
    "/devices/{device_id}",
    response_model=PaymentDeviceResponse,
    summary="Update payment device",
    description="Update device name or status. Owner only.",
)
def update_device(
    device_id: int,
    update_data: PaymentDeviceUpdate,
    current_user: OwnerUser,
    db: Session = Depends(get_db),
) -> PaymentDeviceResponse:
    """Update payment device."""
    business_id = current_user.business_id
    try:
        device = payment_service.update_payment_device(
            db=db,
            business_id=business_id,
            device_id=device_id,
            update_data=update_data.model_dump(exclude_unset=True),
        )

        # Get config for provider info
        config = payment_service.get_payment_configuration(db=db, business_id=business_id)
        provider = config.provider if config else PaymentProvider.SQUARE

        return PaymentDeviceResponse(
            id=device.id,
            business_id=device.business_id,
            device_id=device.device_id,
            device_name=device.device_name,
            location_id=device.location_id,
            is_active=device.is_active,
            paired_at=device.paired_at,
            last_used_at=device.last_used_at,
            created_at=device.created_at,
            updated_at=device.updated_at,
            device_metadata=device.device_metadata,
            provider=provider,
        )

    except PaymentServiceError as e:
        logger.error(f"Payment service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update device: {str(e)}",
        )


@router.delete(
    "/devices/{device_id}",
    summary="Unpair payment device",
    description="Remove a paired device. Owner only.",
)
def unpair_device(
    device_id: int,
    current_user: OwnerUser,
    db: Session = Depends(get_db),
) -> dict:
    """Unpair a payment device."""
    business_id = current_user.business_id
    try:
        deleted = payment_service.delete_payment_device(
            db=db, business_id=business_id, device_id=device_id
        )

        if deleted:
            return {"success": True, "message": "Device unpaired successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to unpair device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unpair device: {str(e)}",
        )


# Test/Sandbox Endpoints


@router.post(
    "/devices/test",
    response_model=TestDeviceResponse,
    summary="Pair test device (sandbox only)",
    description="Pair a Square sandbox test device. Only works in sandbox environment. Owner/Staff can use.",
)
def pair_test_device(
    test_request: TestDeviceRequest,
    current_user: OwnerOrStaffUser,
    db: Session = Depends(get_db),
) -> TestDeviceResponse:
    """Pair a test device for sandbox testing."""
    business_id = current_user.business_id
    try:
        # Check if sandbox mode
        if settings.SQUARE_ENVIRONMENT.lower() != "sandbox":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Test devices only available in sandbox environment",
            )

        # Get config
        config = payment_service.get_payment_configuration(db=db, business_id=business_id)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment configuration found. Complete OAuth first.",
            )

        location_id = test_request.location_id or (
            config.settings.get("location_id") if config.settings else None
        )

        if not location_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="location_id is required",
            )

        # Create device record directly (no pairing needed for test devices)
        device = payment_service.create_payment_device(
            db=db,
            business_id=business_id,
            device_data={
                "device_id": test_request.test_device_id,
                "device_name": test_request.device_name,
                "location_id": location_id,
                "pairing_code": "TEST_MODE",
                "device_metadata": {
                    "test_device": True,
                    "device_type": test_request.test_device_id,
                },
            },
        )

        return TestDeviceResponse(
            success=True,
            device=PaymentDeviceResponse(
                id=device.id,
                business_id=device.business_id,
                device_id=device.device_id,
                device_name=device.device_name,
                location_id=device.location_id,
                is_active=device.is_active,
                paired_at=device.paired_at,
                last_used_at=device.last_used_at,
                created_at=device.created_at,
                updated_at=device.updated_at,
                device_metadata=device.device_metadata,
                provider=config.provider,
            ),
            message="Test device paired successfully",
        )

    except PaymentServiceError as e:
        logger.error(f"Payment service error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to pair test device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pair test device: {str(e)}",
        )


# Order Endpoints


@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create order from appointment",
    description="Create a new order from an existing appointment. Staff and Owner only.",
)
def create_order(
    order_data: OrderCreate,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """
    Create an order from an appointment.

    This endpoint creates an order record with denormalized data from the
    appointment, pet, groomer, and service. The order is created with
    payment_status='unpaid' and order_status='pending'.
    """
    try:
        order = OrderService.create_order_from_appointment(
            db=db,
            appointment_id=order_data.appointment_id,
            business_id=business_id,
            tax_rate=order_data.tax_rate
        )
        return order

    except ValueError as e:
        logger.error(f"Validation error creating order: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create order: {str(e)}"
        )


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get order by ID",
    description="Get order details by ID. Staff and Owner only.",
)
def get_order(
    order_id: int,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """Get order details by ID"""
    order = OrderService.get_order_by_id(db, order_id, business_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found"
        )
    return order


@router.get(
    "/appointments/{appointment_id}/order",
    response_model=OrderResponse | None,
    summary="Get order for appointment",
    description="Get order associated with an appointment. Staff and Owner only.",
)
def get_appointment_order(
    appointment_id: int,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """Get order for a specific appointment"""
    return OrderService.get_order_by_appointment(db, appointment_id, business_id)


@router.patch(
    "/orders/{order_id}/discount",
    response_model=OrderResponse,
    summary="Update order discount",
    description="Update discount for an order and recalculate totals. Staff and Owner only.",
)
def update_order_discount(
    order_id: int,
    discount_data: OrderUpdateDiscount,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """
    Update order discount before payment processing.

    This endpoint allows updating the discount type and value for an order.
    The order totals (tax and total) are automatically recalculated based on
    the discount.

    Discount types:
    - "percentage": Discount value is a percentage (e.g., 15 for 15% off)
    - "dollar": Discount value is a fixed dollar amount (e.g., 15 for $15 off)
    - None: Remove discount
    """
    try:
        order = OrderService.update_order_discount(
            db=db,
            order_id=order_id,
            business_id=business_id,
            discount_type=discount_data.discount_type,
            discount_value=discount_data.discount_value,
        )
        return order
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating order discount: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update order discount"
        )


# Payment Processing Endpoints


@router.post(
    "/terminal/checkout",
    response_model=InitiateTerminalPaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Initiate terminal payment",
    description="Start a payment on Square Terminal. Staff and Owner only.",
)
def initiate_terminal_payment(
    payment_data: InitiateTerminalPaymentRequest,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """
    Initiate a payment on Square Terminal.

    This creates a Square checkout on the specified device and returns
    the checkout ID for status polling. The payment status is set to 'pending'
    and the order payment_status is updated to 'pending'.
    """
    try:
        # Get current user ID if available
        processed_by_id = current_user.id if hasattr(current_user, 'id') else None

        payment = PaymentProcessingService.initiate_terminal_payment(
            db=db,
            order_id=payment_data.order_id,
            business_id=business_id,
            payment_device_id=payment_data.payment_device_id,
            processed_by_id=processed_by_id
        )

        return InitiateTerminalPaymentResponse(
            payment_id=payment.id,
            square_checkout_id=payment.square_checkout_id,
            status=payment.status,
            amount=float(payment.amount),
            order_number=payment.order.order_number if payment.order else "N/A"
        )

    except ValueError as e:
        logger.error(f"Validation error initiating payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to initiate terminal payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate terminal payment: {str(e)}"
        )


@router.get(
    "/terminal/{payment_id}/status",
    response_model=PaymentStatusResponse,
    summary="Get payment status",
    description="Poll payment status from Square Terminal. Staff and Owner only.",
)
def get_payment_status(
    payment_id: int,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """
    Get current payment status from Square.

    This polls Square for the current checkout status and updates local
    records accordingly. Use this endpoint to monitor payment progress.
    """
    try:
        status_info = PaymentProcessingService.poll_payment_status(
            db=db,
            payment_id=payment_id,
            business_id=business_id
        )
        return PaymentStatusResponse(**status_info)

    except ValueError as e:
        logger.error(f"Validation error polling payment status: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to poll payment status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to poll payment status: {str(e)}"
        )


@router.post(
    "/terminal/{payment_id}/cancel",
    response_model=dict,
    summary="Cancel terminal payment",
    description="Cancel a pending terminal payment. Staff and Owner only.",
)
def cancel_terminal_payment(
    payment_id: int,
    current_user: OwnerOrStaffUser,
    business_id: BusinessId,
    db: Session = Depends(get_db),
):
    """
    Cancel a pending terminal payment.

    This cancels the Square checkout and updates the payment and order
    statuses accordingly.
    """
    try:
        payment = PaymentProcessingService.cancel_payment(
            db=db,
            payment_id=payment_id,
            business_id=business_id
        )

        return {
            "success": True,
            "message": f"Payment {payment_id} cancelled",
            "payment_id": payment.id,
            "status": payment.status
        }

    except ValueError as e:
        logger.error(f"Validation error cancelling payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to cancel payment: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel payment: {str(e)}"
        )
