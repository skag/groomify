"""Pet model"""

from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Pet(Base):
    """Pet belonging to a customer"""

    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    species: Mapped[str] = mapped_column(String(50), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(100))
    age: Mapped[int | None] = mapped_column(Integer)
    weight: Mapped[float | None] = mapped_column(Float)
    special_notes: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[list[dict] | None] = mapped_column(
        JSON, default=[]
    )  # [{date, note, created_by_id}, ...]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="pets")
    business: Mapped["Business"] = relationship(back_populates="pets")
    appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="pet", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Pet(id={self.id}, name='{self.name}', species='{self.species}')>"
