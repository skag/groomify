"""Animal Type model - Global lookup table for animal types (Dog, Cat, etc.)"""

from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AnimalType(Base):
    """
    Global lookup table for animal types.

    Examples: Dog, Cat, Bird, Horse, Rabbit, Guinea Pig, etc.
    This is a shared lookup table used across all businesses.
    """

    __tablename__ = "animal_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    breeds: Mapped[list["AnimalBreed"]] = relationship(
        back_populates="animal_type", cascade="all, delete-orphan"
    )
    services: Mapped[list["Service"]] = relationship(
        secondary="service_animal_types", back_populates="animal_types"
    )

    def __repr__(self) -> str:
        return f"<AnimalType(id={self.id}, name='{self.name}')>"
