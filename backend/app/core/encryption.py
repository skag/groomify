"""
Encryption utilities for sensitive data.

This module provides encryption/decryption functions for storing sensitive
data like OAuth tokens and payment credentials.
"""

import json
from cryptography.fernet import Fernet

from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger("app.core.encryption")


def get_encryption_key() -> bytes:
    """
    Get the encryption key for payment/OAuth data.

    Uses PAYMENT_ENCRYPTION_KEY if set, otherwise falls back to OAUTH_ENCRYPTION_KEY.
    Raises ValueError if neither is configured.

    Returns:
        bytes: The Fernet encryption key
    """
    key = settings.PAYMENT_ENCRYPTION_KEY or settings.OAUTH_ENCRYPTION_KEY
    if not key:
        raise ValueError(
            "Encryption key not configured. Set PAYMENT_ENCRYPTION_KEY or OAUTH_ENCRYPTION_KEY environment variable."
        )
    return key.encode() if isinstance(key, str) else key


def encrypt_data(data: dict) -> str:
    """
    Encrypt a dictionary to a string using Fernet encryption.

    Args:
        data: Dictionary to encrypt

    Returns:
        str: Encrypted string

    Raises:
        ValueError: If encryption key is not configured
    """
    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        json_data = json.dumps(data)
        encrypted_bytes = fernet.encrypt(json_data.encode())
        return encrypted_bytes.decode()
    except Exception as e:
        logger.error(f"Failed to encrypt data: {e}")
        raise


def decrypt_data(encrypted_str: str) -> dict:
    """
    Decrypt a Fernet-encrypted string back to a dictionary.

    Args:
        encrypted_str: Encrypted string

    Returns:
        dict: Decrypted dictionary

    Raises:
        ValueError: If encryption key is not configured or decryption fails
    """
    try:
        key = get_encryption_key()
        fernet = Fernet(key)
        decrypted_bytes = fernet.decrypt(encrypted_str.encode())
        return json.loads(decrypted_bytes.decode())
    except Exception as e:
        logger.error(f"Failed to decrypt data: {e}")
        raise


def generate_encryption_key() -> str:
    """
    Generate a new Fernet encryption key.

    Returns:
        str: Base64-encoded Fernet key

    Note:
        This is a utility function for generating new keys.
        Store the generated key securely in environment variables.
    """
    return Fernet.generate_key().decode()
