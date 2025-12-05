"""Application configuration management"""

import os
from typing import ClassVar

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables"""

    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "postgresql://postgres:password@localhost:5432/freedom_db"
    )

    # Application Configuration
    APP_NAME: str = os.getenv("APP_NAME", "Freedom API")
    APP_VERSION: str = os.getenv("APP_VERSION", "0.1.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "3000"))

    # Security Configuration
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "your-secret-key-change-this-in-production"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv(
        "JWT_SECRET_KEY", "your-256-bit-secret-key-change-this-in-production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ISSUER: str = os.getenv("JWT_ISSUER", "freedom-api.com")
    JWT_AUDIENCE: str = os.getenv("JWT_AUDIENCE", "freedom-api.com")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(
        os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "90")
    )

    # CORS Configuration
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173,http://localhost:3000",
    )

    # File Upload Configuration
    UPLOAD_DIRECTORY: str = os.getenv("UPLOAD_DIRECTORY", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB in bytes

    # Allowed image MIME types (standard web formats only, excludes HEIC/HEIF)
    ALLOWED_IMAGE_TYPES: ClassVar[tuple[str, ...]] = (
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
    )

    # Blocked file extensions
    BLOCKED_FILE_EXTENSIONS: ClassVar[tuple[str, ...]] = (".heic", ".heif")

    # Storage Backend Configuration
    STORAGE_BACKEND: str = os.getenv("STORAGE_BACKEND", "local")  # "local" or "gcs"

    # Google Cloud Storage Configuration
    GCS_BUCKET_NAME: str = os.getenv("GCS_BUCKET_NAME", "freedom-dev-media")
    GCS_PROJECT_ID: str | None = os.getenv("GCS_PROJECT_ID")
    GCS_CREDENTIALS_PATH: str | None = os.getenv("GCS_CREDENTIALS_PATH")
    GCS_PUBLIC_URL: bool = os.getenv("GCS_PUBLIC_URL", "true").lower() == "true"


    # Email Configuration (Resend)
    RESEND_API_KEY: str | None = os.getenv("RESEND_API_KEY")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "noreply@yourdomain.com")
    RESEND_FROM_NAME: str = os.getenv("RESEND_FROM_NAME", "Perencore")
    EMAIL_LOGO_URL: str | None = os.getenv(
        "EMAIL_LOGO_URL"
    )  # URL to logo image for email header
    EMAIL_WORKER_ENABLED: bool = (
        os.getenv("EMAIL_WORKER_ENABLED", "true").lower() == "true"
    )
    EMAIL_RETRY_MAX_ATTEMPTS: int = int(os.getenv("EMAIL_RETRY_MAX_ATTEMPTS", "3"))
    EMAIL_RETRY_BACKOFF_SECONDS: int = int(
        os.getenv("EMAIL_RETRY_BACKOFF_SECONDS", "60")
    )
    EMAIL_TEST_MODE: bool = os.getenv("EMAIL_TEST_MODE", "false").lower() == "true"
    EMAIL_TEST_RECIPIENT: str | None = os.getenv(
        "EMAIL_TEST_RECIPIENT"
    )  # Override all email recipients when EMAIL_TEST_MODE=true (e.g., "test@example.com")
   
    # OAuth Configuration - Google
    GOOGLE_CLIENT_ID: str | None = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str | None = os.getenv("GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:5173/oauth/callback"
    )

    # OAuth Token Encryption
    OAUTH_ENCRYPTION_KEY: str | None = os.getenv(
        "OAUTH_ENCRYPTION_KEY"
    )  # Fernet key for encrypting OAuth tokens

    # Payment Processing Configuration - Square
    SQUARE_APP_ID: str | None = os.getenv("SQUARE_APP_ID")
    SQUARE_APP_SECRET: str | None = os.getenv("SQUARE_APP_SECRET")
    SQUARE_REDIRECT_URI: str = os.getenv(
        "SQUARE_REDIRECT_URI", "http://localhost:8000/api/payments/oauth/callback"
    )
    SQUARE_ENVIRONMENT: str = os.getenv("SQUARE_ENVIRONMENT", "sandbox")  # "sandbox" or "production"

    # Payment Encryption Key (uses OAUTH_ENCRYPTION_KEY if not specified)
    PAYMENT_ENCRYPTION_KEY: str | None = os.getenv("PAYMENT_ENCRYPTION_KEY")

    # Frontend URL for OAuth redirects
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Database Configuration Properties
    @property
    def database_url(self) -> str:
        """Get the database URL for SQLAlchemy"""
        return self.DATABASE_URL

    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.DEBUG

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return not self.DEBUG

    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins as a list"""
        return [
            origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()
        ]

    # JWT Configuration Properties
    @property
    def jwt_secret_key(self) -> str:
        """Get JWT secret key"""
        return self.JWT_SECRET_KEY

    @property
    def jwt_algorithm(self) -> str:
        """Get JWT algorithm"""
        return self.JWT_ALGORITHM

    @property
    def jwt_issuer(self) -> str:
        """Get JWT issuer"""
        return self.JWT_ISSUER

    @property
    def jwt_audience(self) -> str:
        """Get JWT audience"""
        return self.JWT_AUDIENCE

    @property
    def jwt_access_token_expire_minutes(self) -> int:
        """Get JWT access token expiration in minutes"""
        return self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES

    @property
    def jwt_refresh_token_expire_days(self) -> int:
        """Get JWT refresh token expiration in days"""
        return self.JWT_REFRESH_TOKEN_EXPIRE_DAYS


# Create a global settings instance
settings = Settings()


def get_settings() -> Settings:
    """
    Get application settings

    Returns:
        Settings instance
    """
    return settings
