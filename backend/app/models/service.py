"""Service model - Main service/offering model with multi-tenant support"""

from datetime import datetime, timezone
from sqlalchemy import (
    String,
    Text,
    DateTime,
    Integer,
    Numeric,
    Boolean,
    ForeignKey,
    Table,
    Column,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


# Association table for Service to Staff (many-to-many)
service_staff = Table(
    "service_staff",
    Base.metadata,
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "business_user_id",
        ForeignKey("business_users.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# Association table for Service to Animal Types (many-to-many)
service_animal_types = Table(
    "service_animal_types",
    Base.metadata,
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "animal_type_id",
        ForeignKey("animal_types.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)

# Association table for Service to Animal Breeds (many-to-many)
service_animal_breeds = Table(
    "service_animal_breeds",
    Base.metadata,
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "animal_breed_id",
        ForeignKey("animal_breeds.id", ondelete="RESTRICT"),
        primary_key=True,
    ),
)


class Service(Base):
    """
    Service/Offering model for businesses.

    Represents services offered by a business (grooming, boarding, training, etc.)
    with support for:
    - Service categories
    - Pricing and tax
    - Staff assignments (which staff can perform this service)
    - Animal type/breed restrictions (which animals this service is for)

    Uses flag-based approach for "all animals/breeds" optimization to avoid
    unnecessary joins when service applies to all types/breeds.
    """

    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Multi-tenant
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Category
    category_id: Mapped[int] = mapped_column(
        ForeignKey("service_categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Basic Info
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)

    # Duration and Pricing
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax_rate: Mapped[float | None] = mapped_column(
        Numeric(5, 2)
    )  # Stored as percentage (e.g., 8.5 for 8.5%)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Animal/Breed Filtering Flags (for optimization)
    applies_to_all_animal_types: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    applies_to_all_breeds: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
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
    business: Mapped["Business"] = relationship(back_populates="services")
    category: Mapped["ServiceCategory"] = relationship(back_populates="services")
    appointments: Mapped[list["Appointment"]] = relationship(
        secondary="appointment_services", back_populates="services"
    )

    # Staff who can perform this service (many-to-many)
    # If empty, service is available to all staff
    staff_members: Mapped[list["BusinessUser"]] = relationship(
        secondary=service_staff, back_populates="services"
    )

    # Animal types this service applies to (many-to-many)
    # Only used when applies_to_all_animal_types = False
    animal_types: Mapped[list["AnimalType"]] = relationship(
        secondary=service_animal_types, back_populates="services"
    )

    # Specific breeds this service applies to (many-to-many)
    # Only used when applies_to_all_breeds = False
    animal_breeds: Mapped[list["AnimalBreed"]] = relationship(
        secondary=service_animal_breeds, back_populates="services"
    )

    def __repr__(self) -> str:
        return f"<Service(id={self.id}, business_id={self.business_id}, name='{self.name}')>"
