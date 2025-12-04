"""Database configuration and session management"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""

    pass


# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    echo=False,  # Disable verbose SQL logging
    pool_pre_ping=True,  # Verify connections before use
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Use this with FastAPI's Depends() to inject database sessions.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
