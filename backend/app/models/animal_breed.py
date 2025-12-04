"""Animal Breed model - Global lookup table for animal breeds"""

from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AnimalBreed(Base):
    """
    Global lookup table for animal breeds.

    Links to AnimalType to categorize breeds by animal type.
    Examples: Poodle (Dog), Persian (Cat), Parakeet (Bird), etc.
    This is a shared lookup table used across all businesses.
    """

    __tablename__ = "animal_breeds"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    animal_type_id: Mapped[int] = mapped_column(
        ForeignKey("animal_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

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
    animal_type: Mapped["AnimalType"] = relationship(back_populates="breeds")
    services: Mapped[list["Service"]] = relationship(
        secondary="service_animal_breeds", back_populates="animal_breeds"
    )

    # Constraints
    __table_args__ = (
        UniqueConstraint("animal_type_id", "name", name="uq_animal_breed_type_name"),
    )

    def __repr__(self) -> str:
        return f"<AnimalBreed(id={self.id}, name='{self.name}', animal_type_id={self.animal_type_id})>"
