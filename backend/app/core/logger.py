"""Application logger configuration and utilities"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler


def get_logger(name):
    """
    Get a configured logger instance with both file and console handlers.

    Args:
        name (str): The name of the logger, typically __name__ of the calling module

    Returns:
        logging.Logger: Configured logger instance
    """
    # Create logger
    logger = logging.getLogger(name)

    # Check if handlers already exist (avoid duplicate handlers)
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)

    # Create formatters
    console_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    # Skip file handler in test environment
    if not os.environ.get("TESTING"):
        file_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        # Create and configure file handler (only in development)
        from app.core.config import settings

        if settings.DEBUG:
            # In development, log to file
            log_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs"
            )
            try:
                os.makedirs(log_dir, exist_ok=True)
                log_filename = "app.log"
                file_handler = RotatingFileHandler(
                    filename=os.path.join(log_dir, log_filename),
                    maxBytes=10 * 1024 * 1024,  # 10MB
                    backupCount=5,
                )
                file_handler.setLevel(logging.INFO)
                file_handler.setFormatter(file_formatter)
                logger.addHandler(file_handler)
            except (PermissionError, OSError):
                # If we can't create log directory (e.g., in containers), skip file logging
                pass

    # Create and configure console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)

    # Add handlers to logger
    logger.addHandler(console_handler)

    return logger


def setup_logging():
    """Setup basic logging configuration"""
    # This function exists for compatibility but the new get_logger handles everything
    pass


# For backward compatibility with existing code
security_logger = get_logger("security")


class SecurityLogger:
    """Simplified security logger"""

    def __init__(self):
        self.logger = get_logger("security")

    def log_token_generation(
        self, email: str, token_type: str, token_plain: str = None, **_kwargs
    ):
        """Log token generation with plain token in development"""
        from app.core.config import settings

        if settings.DEBUG and token_plain:
            # In debug mode, log the plain token for testing
            self.logger.info(
                f"🔑 TOKEN FOR {email}: {token_plain} (type: {token_type})"
            )
        else:
            self.logger.info(f"Token generated for {email} (type: {token_type})")

    def log_auth_attempt(
        self, email: str, action: str, success: bool, ip_address: str, **_kwargs
    ):
        """Log authentication attempt"""
        status = "SUCCESS" if success else "FAILED"
        self.logger.info(f"Auth {action} for {email}: {status} from {ip_address}")


# Global security logger instance
security_logger = SecurityLogger()
