"""
Payment service layer.

This module provides business logic for payment provider configuration,
OAuth flows, and device pairing. It acts as the interface between API
endpoints and provider implementations.
"""

import secrets
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.encryption import decrypt_data, encrypt_data
from app.core.logger import get_logger
from app.models.payment_configuration import PaymentConfiguration, PaymentProvider
from app.models.payment_device import PaymentDevice
from app.services.payment_provider_interface import PaymentProviderInterface
from app.services.providers.square_provider import SquarePaymentProvider

logger = get_logger("app.services.payment")


class PaymentServiceError(Exception):
    """Custom exception for payment service errors."""

    pass


def get_payment_provider(
    db: Session, business_id: int, provider: PaymentProvider | None = None
) -> PaymentProviderInterface:
    """
    Get payment provider instance for a business.

    Args:
        db: Database session
        business_id: Business ID
        provider: Optional provider type (defaults to active provider)

    Returns:
        PaymentProviderInterface: Provider instance

    Raises:
        PaymentServiceError: If no configuration found or provider not supported
    """
    query = db.query(PaymentConfiguration).filter(
        PaymentConfiguration.business_id == business_id
    )

    if provider:
        query = query.filter(PaymentConfiguration.provider == provider)

    config = query.filter(PaymentConfiguration.is_active == True).first()

    if not config:
        raise PaymentServiceError(
            f"No active payment configuration found for provider: {provider or 'any'}"
        )

    # Decrypt credentials
    credentials = decrypt_data(config.encrypted_credentials)

    # Create provider instance
    if config.provider == PaymentProvider.SQUARE:
        return SquarePaymentProvider(credentials, config.settings)
    elif config.provider == PaymentProvider.CLOVER:
        raise PaymentServiceError("Clover provider not yet implemented")
    else:
        raise PaymentServiceError(f"Unsupported provider: {config.provider}")


def get_payment_configuration(
    db: Session, business_id: int, provider: PaymentProvider | None = None
) -> PaymentConfiguration | None:
    """
    Get payment configuration for a business.

    Args:
        db: Database session
        business_id: Business ID
        provider: Optional provider filter

    Returns:
        PaymentConfiguration | None: Configuration or None
    """
    query = db.query(PaymentConfiguration).filter(
        PaymentConfiguration.business_id == business_id
    )

    if provider:
        query = query.filter(PaymentConfiguration.provider == provider)

    return query.filter(PaymentConfiguration.is_active == True).first()


def generate_oauth_state() -> str:
    """
    Generate a secure random state for OAuth flow.

    Returns:
        str: Random state string
    """
    return secrets.token_urlsafe(32)


def create_or_update_payment_configuration(
    db: Session,
    business_id: int,
    provider: PaymentProvider,
    credentials: dict[str, Any],
    settings: dict[str, Any] | None = None,
) -> PaymentConfiguration:
    """
    Create or update payment configuration for a business.

    Args:
        db: Database session
        business_id: Business ID
        provider: Payment provider
        credentials: Provider credentials (will be encrypted)
        settings: Optional provider settings

    Returns:
        PaymentConfiguration: Created or updated configuration
    """
    # Check for existing configuration
    existing = (
        db.query(PaymentConfiguration)
        .filter(
            PaymentConfiguration.business_id == business_id,
            PaymentConfiguration.provider == provider,
        )
        .first()
    )

    # Encrypt credentials
    encrypted_credentials = encrypt_data(credentials)

    if existing:
        # Update existing
        existing.encrypted_credentials = encrypted_credentials
        existing.settings = settings or existing.settings
        existing.is_active = True
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        logger.info(
            f"Updated payment configuration for business {business_id}, provider {provider.value}"
        )
        return existing
    else:
        # Create new
        config = PaymentConfiguration(
            business_id=business_id,
            provider=provider,
            encrypted_credentials=encrypted_credentials,
            settings=settings or {},
            is_active=True,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
        logger.info(
            f"Created payment configuration for business {business_id}, provider {provider.value}"
        )
        return config


def delete_payment_configuration(
    db: Session, business_id: int, provider: PaymentProvider
) -> bool:
    """
    Delete payment configuration for a business.

    Args:
        db: Database session
        business_id: Business ID
        provider: Payment provider

    Returns:
        bool: True if deleted
    """
    config = (
        db.query(PaymentConfiguration)
        .filter(
            PaymentConfiguration.business_id == business_id,
            PaymentConfiguration.provider == provider,
        )
        .first()
    )

    if not config:
        return False

    # Try to revoke access with provider
    try:
        provider_instance = get_payment_provider(db, business_id, provider)
        provider_instance.revoke_access()
    except Exception as e:
        logger.warning(f"Failed to revoke provider access: {e}")

    db.delete(config)
    db.commit()
    logger.info(
        f"Deleted payment configuration for business {business_id}, provider {provider.value}"
    )
    return True


def create_payment_device(
    db: Session, business_id: int, device_data: dict[str, Any]
) -> PaymentDevice:
    """
    Create a payment device.

    Args:
        db: Database session
        business_id: Business ID
        device_data: Device data from pairing

    Returns:
        PaymentDevice: Created device
    """
    # Get active payment configuration
    config = get_payment_configuration(db, business_id)
    if not config:
        raise PaymentServiceError("No active payment configuration found")

    device = PaymentDevice(
        business_id=business_id,
        configuration_id=config.id,
        device_id=device_data["device_id"],
        device_name=device_data["device_name"],
        location_id=device_data["location_id"],
        pairing_code=device_data.get("pairing_code"),
        paired_at=datetime.now(timezone.utc),
        device_metadata=device_data.get("device_metadata"),
        is_active=True,
    )

    db.add(device)
    db.commit()
    db.refresh(device)
    logger.info(
        f"Created payment device {device.device_id} for business {business_id}"
    )
    return device


def get_payment_device(
    db: Session, business_id: int, device_id: int
) -> PaymentDevice | None:
    """
    Get a payment device by ID.

    Args:
        db: Database session
        business_id: Business ID
        device_id: Device ID

    Returns:
        PaymentDevice | None: Device or None
    """
    return (
        db.query(PaymentDevice)
        .filter(
            PaymentDevice.business_id == business_id, PaymentDevice.id == device_id
        )
        .first()
    )


def list_payment_devices(db: Session, business_id: int) -> list[PaymentDevice]:
    """
    List all payment devices for a business.

    Args:
        db: Database session
        business_id: Business ID

    Returns:
        list[PaymentDevice]: List of devices
    """
    return (
        db.query(PaymentDevice)
        .filter(PaymentDevice.business_id == business_id)
        .order_by(PaymentDevice.created_at.desc())
        .all()
    )


def update_payment_device(
    db: Session, business_id: int, device_id: int, update_data: dict[str, Any]
) -> PaymentDevice:
    """
    Update a payment device.

    Args:
        db: Database session
        business_id: Business ID
        device_id: Device ID
        update_data: Fields to update

    Returns:
        PaymentDevice: Updated device
    """
    device = get_payment_device(db, business_id, device_id)
    if not device:
        raise PaymentServiceError("Device not found")

    for key, value in update_data.items():
        if hasattr(device, key) and value is not None:
            setattr(device, key, value)

    device.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(device)
    logger.info(f"Updated payment device {device_id} for business {business_id}")
    return device


def delete_payment_device(db: Session, business_id: int, device_id: int) -> bool:
    """
    Delete a payment device.

    Args:
        db: Database session
        business_id: Business ID
        device_id: Device ID

    Returns:
        bool: True if deleted
    """
    device = get_payment_device(db, business_id, device_id)
    if not device:
        return False

    db.delete(device)
    db.commit()
    logger.info(f"Deleted payment device {device_id} for business {business_id}")
    return True


def update_device_last_used(db: Session, device_id: int) -> None:
    """
    Update the last_used_at timestamp for a device.

    Args:
        db: Database session
        device_id: Device ID
    """
    device = db.query(PaymentDevice).filter(PaymentDevice.id == device_id).first()
    if device:
        device.last_used_at = datetime.now(timezone.utc)
        db.commit()
