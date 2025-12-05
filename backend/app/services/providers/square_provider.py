"""
Square payment provider implementation.

This module implements the PaymentProviderInterface for Square,
handling OAuth authorization and Terminal device pairing.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

from square import Square
from square.client import SquareEnvironment

from app.core.config import settings
from app.core.logger import get_logger
from app.services.payment_provider_interface import PaymentProviderInterface

logger = get_logger("app.services.providers.square")


class SquarePaymentProvider(PaymentProviderInterface):
    """Square payment provider implementation."""

    def __init__(self, credentials: dict[str, Any] | None = None, provider_settings: dict[str, Any] | None = None):
        """
        Initialize Square provider.

        Args:
            credentials: Decrypted OAuth credentials (access_token, refresh_token, etc.)
            provider_settings: Provider-specific settings (location_id, environment)
        """
        super().__init__(credentials or {}, provider_settings or {})

        # Determine environment
        environment = self.settings.get("environment", settings.SQUARE_ENVIRONMENT)
        self.is_production = environment.lower() == "production"

        # Initialize Square client
        self.client = self._create_client()

    def _create_client(self) -> Square:
        """Create Square SDK client with current credentials."""
        access_token = self.credentials.get("access_token")

        return Square(
            token=access_token,
            environment=SquareEnvironment.PRODUCTION if self.is_production else SquareEnvironment.SANDBOX,
        )

    def _refresh_client(self) -> None:
        """Refresh the Square client with updated credentials."""
        self.client = self._create_client()

    def get_oauth_authorization_url(self, state: str, redirect_uri: str) -> str:
        """
        Generate Square OAuth authorization URL.

        Args:
            state: CSRF state parameter
            redirect_uri: OAuth callback URL

        Returns:
            str: Authorization URL
        """
        if not settings.SQUARE_APP_ID:
            raise ValueError("SQUARE_APP_ID not configured")

        base_url = "https://connect.squareup.com/oauth2/authorize" if self.is_production else "https://connect.squareupsandbox.com/oauth2/authorize"

        params = {
            "client_id": settings.SQUARE_APP_ID,
            "scope": "MERCHANT_PROFILE_READ PAYMENTS_READ PAYMENTS_WRITE DEVICE_CREDENTIAL_MANAGEMENT",
            "session": "false",
            "state": state,
        }

        return f"{base_url}?{urlencode(params)}"

    def exchange_authorization_code(self, code: str, redirect_uri: str) -> dict[str, Any]:
        """
        Exchange authorization code for access tokens.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: OAuth callback URL

        Returns:
            dict: Credentials containing access_token, refresh_token, expires_at, merchant_id
        """
        if not settings.SQUARE_APP_ID or not settings.SQUARE_APP_SECRET:
            raise ValueError("Square OAuth credentials not configured")

        try:
            result = self.client.o_auth.obtain_token(
                client_id=settings.SQUARE_APP_ID,
                client_secret=settings.SQUARE_APP_SECRET,
                code=code,
                grant_type="authorization_code",
            )

            # Square SDK raises exceptions on error, so if we're here it succeeded
            # Result attributes are directly on the object
            # Calculate expiration time
            expires_at_str = result.expires_at if hasattr(result, 'expires_at') else None
            if expires_at_str:
                # Square gives us an ISO timestamp string
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            else:
                # Fallback: assume 30 days if not provided
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)

            credentials = {
                "access_token": result.access_token,
                "refresh_token": result.refresh_token if hasattr(result, 'refresh_token') else None,
                "expires_at": expires_at.isoformat(),
                "merchant_id": result.merchant_id if hasattr(result, 'merchant_id') else None,
                "token_type": result.token_type if hasattr(result, 'token_type') else "bearer",
            }

            # Update our credentials and refresh client
            self.credentials.update(credentials)
            self._refresh_client()

            return credentials

        except Exception as e:
            logger.error(f"Failed to exchange authorization code: {e}")
            raise

    def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        """
        Refresh an expired access token.

        Args:
            refresh_token: Refresh token from previous authorization

        Returns:
            dict: Updated credentials with new access_token
        """
        if not settings.SQUARE_APP_ID or not settings.SQUARE_APP_SECRET:
            raise ValueError("Square OAuth credentials not configured")

        try:
            result = self.client.o_auth.obtain_token(
                client_id=settings.SQUARE_APP_ID,
                client_secret=settings.SQUARE_APP_SECRET,
                refresh_token=refresh_token,
                grant_type="refresh_token",
            )

            # Square SDK raises exceptions on error, so if we're here it succeeded
            # Calculate new expiration
            expires_at_str = result.expires_at if hasattr(result, 'expires_at') else None
            if expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            else:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)

            updated_credentials = {
                "access_token": result.access_token,
                "expires_at": expires_at.isoformat(),
                "merchant_id": result.merchant_id if hasattr(result, 'merchant_id') else None,
            }

            # Update credentials and refresh client
            self.credentials.update(updated_credentials)
            self._refresh_client()

            return updated_credentials

        except Exception as e:
            logger.error(f"Failed to refresh access token: {e}")
            raise

    def revoke_access(self) -> bool:
        """
        Revoke Square OAuth access.

        Returns:
            bool: True if successful
        """
        if not settings.SQUARE_APP_ID or not settings.SQUARE_APP_SECRET:
            raise ValueError("Square OAuth credentials not configured")

        access_token = self.credentials.get("access_token")
        if not access_token:
            return True  # Already revoked

        try:
            self.client.o_auth.revoke_token(
                client_id=settings.SQUARE_APP_ID,
                access_token=access_token,
            )
            # Square SDK raises exceptions on error, so if we're here it succeeded
            return True

        except Exception as e:
            logger.error(f"Failed to revoke access token: {e}")
            return False

    def create_device_code(self, device_name: str, location_id: str) -> dict[str, Any]:
        """
        Create a device code for Square Terminal pairing.

        Args:
            device_name: Human-readable name for the device
            location_id: Square location ID

        Returns:
            dict: Device code information
        """
        self.ensure_valid_token()

        try:
            # Use devices.codes.create() - path is /v2/devices/codes
            result = self.client.devices.codes.create(
                idempotency_key=secrets.token_urlsafe(32),
                device_code={
                    "name": device_name,
                    "product_type": "TERMINAL_API",
                    "location_id": location_id,
                }
            )

            # Access device_code attribute directly
            device_code = result.device_code if hasattr(result, 'device_code') else None
            if not device_code:
                raise ValueError("No device code returned from Square")

            return {
                "device_code_id": device_code.id if hasattr(device_code, 'id') else None,
                "code": device_code.code if hasattr(device_code, 'code') else None,
                "expires_at": device_code.created_at if hasattr(device_code, 'created_at') else None,
                "status": device_code.status if hasattr(device_code, 'status') else None,
                "location_id": device_code.location_id if hasattr(device_code, 'location_id') else None,
            }

        except Exception as e:
            logger.error(f"Failed to create device code: {e}")
            raise

    def get_device_code_status(self, device_code_id: str) -> dict[str, Any]:
        """
        Check the status of a device pairing code.

        Args:
            device_code_id: Device code ID from create_device_code

        Returns:
            dict: Device code status
        """
        self.ensure_valid_token()

        try:
            # Use devices.codes.get() - path is /v2/devices/codes/{id}
            result = self.client.devices.codes.get(id=device_code_id)

            # Access device_code attribute directly
            device_code = result.device_code if hasattr(result, 'device_code') else None
            if not device_code:
                raise ValueError("No device code returned from Square")

            return {
                "status": device_code.status if hasattr(device_code, 'status') else "UNKNOWN",
                "device_id": device_code.device_id if hasattr(device_code, 'device_id') else None,
                "created_at": device_code.created_at if hasattr(device_code, 'created_at') else None,
                "code": device_code.code if hasattr(device_code, 'code') else None,
            }

        except Exception as e:
            logger.error(f"Failed to get device code status: {e}")
            raise

    def get_device_info(self, device_id: str) -> dict[str, Any]:
        """
        Get information about a paired Square device.

        Args:
            device_id: Square device ID

        Returns:
            dict: Device information
        """
        self.ensure_valid_token()

        try:
            result = self.client.devices.get_device(id=device_id)

            # Access device attribute directly
            device = result.device if hasattr(result, 'device') else None
            if not device:
                raise ValueError("No device returned from Square")

            return {
                "device_id": device.id if hasattr(device, 'id') else None,
                "name": device.name if hasattr(device, 'name') else None,
                "status": device.status if hasattr(device, 'status') else None,
                "location_id": device.location_id if hasattr(device, 'location_id') else None,
            }

        except Exception as e:
            logger.error(f"Failed to get device info: {e}")
            raise

    def list_devices(self, location_id: str | None = None) -> list[dict[str, Any]]:
        """
        List all Square devices.

        Args:
            location_id: Optional location ID filter

        Returns:
            list: List of device information
        """
        self.ensure_valid_token()

        try:
            params = {}
            if location_id:
                params["location_ids"] = [location_id]

            result = self.client.devices.list(**params)

            # Access devices attribute directly
            devices = result.devices if hasattr(result, 'devices') else []

            return [
                {
                    "device_id": device.id if hasattr(device, 'id') else None,
                    "name": device.name if hasattr(device, 'name') else None,
                    "status": device.status if hasattr(device, 'status') else None,
                    "location_id": device.location_id if hasattr(device, 'location_id') else None,
                }
                for device in devices
            ]

        except Exception as e:
            logger.error(f"Failed to list devices: {e}")
            raise

    def get_locations(self) -> list[dict[str, Any]]:
        """
        Get all locations for the Square merchant.

        Returns:
            list: List of location information
        """
        self.ensure_valid_token()

        try:
            result = self.client.locations.list()

            # Square SDK raises exceptions on error, so if we're here it succeeded
            # Get locations from result (could be an attribute or in a locations list)
            locations = result.locations if hasattr(result, 'locations') else []

            return [
                {
                    "location_id": loc.id if hasattr(loc, 'id') else None,
                    "name": loc.name if hasattr(loc, 'name') else None,
                    "address": loc.address if hasattr(loc, 'address') else None,
                    "status": loc.status if hasattr(loc, 'status') else None,
                    "merchant_id": loc.merchant_id if hasattr(loc, 'merchant_id') else None,
                }
                for loc in locations
            ]

        except Exception as e:
            logger.error(f"Failed to get locations: {e}")
            raise

    def create_terminal_checkout(
        self,
        device_id: str,
        amount_cents: int,
        reference_id: str | None = None,
        note: str | None = None
    ) -> dict[str, Any]:
        """
        Create a terminal checkout to process payment on Square Terminal.

        This method enables tipping on the terminal with:
        - allow_tipping: True - Enables tip collection
        - separate_tip_screen: True - Shows tip screen after payment
        - smart_tipping: True - Uses Square's smart tip suggestions

        Args:
            device_id: Square device ID to process payment on
            amount_cents: Amount in cents (e.g., 1000 = $10.00)
            reference_id: Optional reference ID (e.g., order number)
            note: Optional note for the checkout

        Returns:
            dict: Checkout information including checkout_id and status
        """
        self.ensure_valid_token()

        try:
            import secrets

            checkout_body = {
                "amount_money": {
                    "amount": amount_cents,
                    "currency": "USD"
                },
                "device_options": {
                    "device_id": device_id,
                    "tip_settings": {
                        "allow_tipping": True,
                        "separate_tip_screen": True,
                        "smart_tipping": True
                    }
                },
                "payment_options": {
                    "autocomplete": True  # Automatically complete payment
                }
            }

            if reference_id:
                checkout_body["reference_id"] = reference_id
            if note:
                checkout_body["note"] = note

            # Log the checkout body being sent to Square
            logger.info("=" * 80)
            logger.info("Creating Square Terminal Checkout")
            logger.info(f"Checkout Body: {checkout_body}")
            logger.info("=" * 80)

            result = self.client.terminal.checkouts.create(
                idempotency_key=secrets.token_urlsafe(32),
                checkout=checkout_body
            )

            # Log what Square returned
            logger.info("Square returned checkout:")
            if hasattr(result, 'checkout'):
                checkout_obj = result.checkout
                logger.info(f"  ID: {checkout_obj.id if hasattr(checkout_obj, 'id') else None}")
                logger.info(f"  Status: {checkout_obj.status if hasattr(checkout_obj, 'status') else None}")
                logger.info(f"  Amount Money: {checkout_obj.amount_money if hasattr(checkout_obj, 'amount_money') else None}")
                logger.info(f"  Device Options: {checkout_obj.device_options if hasattr(checkout_obj, 'device_options') else None}")
                if hasattr(checkout_obj, 'device_options') and checkout_obj.device_options:
                    dev_opts = checkout_obj.device_options
                    logger.info(f"    Tip Settings: {dev_opts.tip_settings if hasattr(dev_opts, 'tip_settings') else None}")
            logger.info("=" * 80)

            checkout = result.checkout if hasattr(result, 'checkout') else None
            if not checkout:
                raise ValueError("No checkout returned from Square")

            return {
                "checkout_id": checkout.id if hasattr(checkout, 'id') else None,
                "status": checkout.status if hasattr(checkout, 'status') else None,
                "amount_money": checkout.amount_money if hasattr(checkout, 'amount_money') else None,
                "device_id": device_id,
                "created_at": checkout.created_at if hasattr(checkout, 'created_at') else None,
                "reference_id": checkout.reference_id if hasattr(checkout, 'reference_id') else None,
            }

        except Exception as e:
            logger.error(f"Failed to create terminal checkout: {e}")
            raise

    def get_terminal_checkout(self, checkout_id: str) -> dict[str, Any]:
        """
        Get the status of a terminal checkout.

        Args:
            checkout_id: Square checkout ID

        Returns:
            dict: Checkout status information including payment details
        """
        self.ensure_valid_token()

        try:
            result = self.client.terminal.checkouts.get(checkout_id=checkout_id)

            checkout = result.checkout if hasattr(result, 'checkout') else None
            if not checkout:
                raise ValueError("No checkout returned from Square")

            # Log the entire checkout object
            logger.info("=" * 80)
            logger.info(f"GET TERMINAL CHECKOUT RESPONSE (ID: {checkout_id})")
            logger.info("=" * 80)
            logger.info(f"Full checkout object: {checkout}")
            if hasattr(checkout, '__dict__'):
                logger.info(f"Checkout attributes: {checkout.__dict__}")
            logger.info(f"Status: {checkout.status if hasattr(checkout, 'status') else None}")
            logger.info(f"Amount Money: {checkout.amount_money if hasattr(checkout, 'amount_money') else None}")
            logger.info(f"Tip Money: {checkout.tip_money if hasattr(checkout, 'tip_money') else None}")
            logger.info(f"Total Money: {checkout.total_money if hasattr(checkout, 'total_money') else None}")
            logger.info(f"Payment IDs: {checkout.payment_ids if hasattr(checkout, 'payment_ids') else None}")
            logger.info(f"Receipt URL: {checkout.receipt_url if hasattr(checkout, 'receipt_url') else None}")
            logger.info("=" * 80)

            # Extract payment ID from payment_ids list if available
            payment_id = None
            if hasattr(checkout, 'payment_ids') and checkout.payment_ids:
                payment_id = checkout.payment_ids[0]
                logger.info(f"Extracted payment_id from payment_ids: {payment_id}")
            else:
                logger.warning("No payment_ids found in checkout")

            result_dict = {
                "checkout_id": checkout.id if hasattr(checkout, 'id') else None,
                "status": checkout.status if hasattr(checkout, 'status') else None,
                "payment_id": payment_id,
                "amount_money": checkout.amount_money if hasattr(checkout, 'amount_money') else None,
                "tip_money": checkout.tip_money if hasattr(checkout, 'tip_money') else None,
                "total_money": checkout.total_money if hasattr(checkout, 'total_money') else None,
                "receipt_url": checkout.receipt_url if hasattr(checkout, 'receipt_url') else None,
                "created_at": checkout.created_at if hasattr(checkout, 'created_at') else None,
                "updated_at": checkout.updated_at if hasattr(checkout, 'updated_at') else None,
            }
            logger.info(f"Returning checkout dict with payment_id: {result_dict.get('payment_id')}")
            return result_dict

        except Exception as e:
            logger.error(f"Failed to get terminal checkout: {e}")
            raise

    def get_payment(self, payment_id: str) -> dict[str, Any]:
        """
        Get payment details from Square Payments API.

        This is separate from the checkout and contains the actual payment details
        including tip amounts that may not be in the checkout response.

        Args:
            payment_id: Square payment ID from checkout.payment_ids

        Returns:
            dict: Payment details including tip information
        """
        self.ensure_valid_token()

        try:
            result = self.client.payments.get(payment_id=payment_id)

            payment = result.payment if hasattr(result, 'payment') else None
            if not payment:
                raise ValueError("No payment returned from Square")

            # Log the full payment object to see what's available
            logger.info("=" * 80)
            logger.info(f"GET PAYMENT RESPONSE (ID: {payment_id})")
            logger.info("=" * 80)
            logger.info(f"Full payment object: {payment}")
            if hasattr(payment, '__dict__'):
                logger.info(f"Payment attributes: {payment.__dict__}")
            logger.info(f"Amount Money: {payment.amount_money if hasattr(payment, 'amount_money') else None}")
            logger.info(f"Tip Money: {payment.tip_money if hasattr(payment, 'tip_money') else None}")
            logger.info(f"Total Money: {payment.total_money if hasattr(payment, 'total_money') else None}")
            logger.info(f"Status: {payment.status if hasattr(payment, 'status') else None}")
            logger.info("=" * 80)

            return {
                "payment_id": payment.id if hasattr(payment, 'id') else None,
                "status": payment.status if hasattr(payment, 'status') else None,
                "amount_money": payment.amount_money if hasattr(payment, 'amount_money') else None,
                "tip_money": payment.tip_money if hasattr(payment, 'tip_money') else None,
                "total_money": payment.total_money if hasattr(payment, 'total_money') else None,
                "receipt_url": payment.receipt_url if hasattr(payment, 'receipt_url') else None,
            }

        except Exception as e:
            logger.error(f"Failed to get payment: {e}")
            raise

    def cancel_terminal_checkout(self, checkout_id: str) -> dict[str, Any]:
        """
        Cancel a pending terminal checkout.

        Args:
            checkout_id: Square checkout ID to cancel

        Returns:
            dict: Cancelled checkout information
        """
        self.ensure_valid_token()

        try:
            result = self.client.terminal.checkouts.cancel(checkout_id=checkout_id)

            checkout = result.checkout if hasattr(result, 'checkout') else None
            if not checkout:
                raise ValueError("No checkout returned from Square")

            return {
                "checkout_id": checkout.id if hasattr(checkout, 'id') else None,
                "status": checkout.status if hasattr(checkout, 'status') else None,
            }

        except Exception as e:
            logger.error(f"Failed to cancel terminal checkout: {e}")
            raise
