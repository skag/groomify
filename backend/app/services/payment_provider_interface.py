"""
Abstract payment provider interface.

This module defines the abstract base class for payment provider implementations,
ensuring a consistent interface across different providers (Square, Clover, etc.).
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any


class PaymentProviderInterface(ABC):
    """
    Abstract base class for payment provider implementations.

    All payment providers (Square, Clover, etc.) must implement this interface
    to ensure consistent behavior across different providers.
    """

    def __init__(self, credentials: dict[str, Any], settings: dict[str, Any] | None = None):
        """
        Initialize payment provider with credentials.

        Args:
            credentials: Decrypted provider credentials (OAuth tokens, API keys)
            settings: Provider-specific settings (location_id, environment, etc.)
        """
        self.credentials = credentials
        self.settings = settings or {}

    @abstractmethod
    def get_oauth_authorization_url(self, state: str, redirect_uri: str) -> str:
        """
        Generate OAuth authorization URL for the provider.

        Args:
            state: CSRF state parameter
            redirect_uri: OAuth callback URL

        Returns:
            str: Authorization URL to redirect user to
        """
        pass

    @abstractmethod
    def exchange_authorization_code(
        self, code: str, redirect_uri: str
    ) -> dict[str, Any]:
        """
        Exchange authorization code for access tokens.

        Args:
            code: Authorization code from OAuth callback
            redirect_uri: OAuth callback URL (must match authorization)

        Returns:
            dict: Credentials containing access_token, refresh_token, expires_at, etc.
        """
        pass

    @abstractmethod
    def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        """
        Refresh an expired access token.

        Args:
            refresh_token: Refresh token from previous authorization

        Returns:
            dict: Updated credentials with new access_token and expires_at
        """
        pass

    @abstractmethod
    def revoke_access(self) -> bool:
        """
        Revoke OAuth access tokens.

        Returns:
            bool: True if revocation successful
        """
        pass

    @abstractmethod
    def create_device_code(
        self, device_name: str, location_id: str
    ) -> dict[str, Any]:
        """
        Create a device code for terminal pairing.

        Args:
            device_name: Human-readable name for the device
            location_id: Provider location ID where device will be used

        Returns:
            dict: Device code information
                - device_code_id: ID for checking pairing status
                - code: Code to display/enter on the physical device
                - expires_at: When the code expires
        """
        pass

    @abstractmethod
    def get_device_code_status(self, device_code_id: str) -> dict[str, Any]:
        """
        Check the status of a device pairing code.

        Args:
            device_code_id: Device code ID from create_device_code

        Returns:
            dict: Device code status
                - status: PENDING, PAIRED, FAILED, EXPIRED
                - device_id: Device ID if successfully paired
                - created_at: When the code was created
        """
        pass

    @abstractmethod
    def get_device_info(self, device_id: str) -> dict[str, Any]:
        """
        Get information about a paired device.

        Args:
            device_id: Provider device ID

        Returns:
            dict: Device information
                - device_id: Provider device ID
                - name: Device name
                - status: Device status
                - model: Device model/type
                - location_id: Location ID
        """
        pass

    @abstractmethod
    def list_devices(self, location_id: str | None = None) -> list[dict[str, Any]]:
        """
        List all devices for the account.

        Args:
            location_id: Optional location ID to filter devices

        Returns:
            list: List of device information dictionaries
        """
        pass

    @abstractmethod
    def get_locations(self) -> list[dict[str, Any]]:
        """
        Get all locations for the merchant account.

        Returns:
            list: List of location information
                - location_id: Provider location ID
                - name: Location name
                - address: Location address
                - status: Location status
        """
        pass

    def is_token_expired(self, expires_at: datetime | None) -> bool:
        """
        Check if an access token is expired.

        Args:
            expires_at: Token expiration datetime

        Returns:
            bool: True if token is expired or expiration is unknown
        """
        if expires_at is None:
            return True
        return datetime.now(timezone.utc) >= expires_at

    def ensure_valid_token(self) -> dict[str, Any]:
        """
        Ensure access token is valid, refreshing if necessary.

        Returns:
            dict: Current valid credentials

        Raises:
            Exception: If token refresh fails
        """
        expires_at = self.credentials.get("expires_at")
        if expires_at and isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)

        if self.is_token_expired(expires_at):
            refresh_token = self.credentials.get("refresh_token")
            if not refresh_token:
                raise ValueError("No refresh token available")

            new_credentials = self.refresh_access_token(refresh_token)
            self.credentials.update(new_credentials)

        return self.credentials
