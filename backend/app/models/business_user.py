"""Business user model (staff and owners)"""

from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, DateTime, Boolean, ForeignKey, Enum as SQLEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class BusinessUserRoleName(str, enum.Enum):
    """Business user role names (used for validation and seeding)"""

    OWNER = "owner"
    STAFF = "staff"
    GROOMER = "groomer"


class BusinessUserStatus(str, enum.Enum):
    """Employment/engagement status for a business user"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    TERMINATED = "terminated"


class BusinessUserRole(Base):
    """Role lookup table for business users"""

    __tablename__ = "business_user_roles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Relationships
    business_users: Mapped[list["BusinessUser"]] = relationship(back_populates="role")

    def __repr__(self) -> str:
        return f"<BusinessUserRole(id={self.id}, name='{self.name}')>"


class BusinessUser(Base):
    """Business users (owners and staff) with password/PIN authentication"""

    __tablename__ = "business_users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role_id: Mapped[int] = mapped_column(
        ForeignKey("business_user_roles.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[BusinessUserStatus] = mapped_column(
        SQLEnum(BusinessUserStatus, native_enum=False, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=BusinessUserStatus.ACTIVE
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Compensation fields (typically used for groomers)
    compensation_type: Mapped[str | None] = mapped_column(
        String(20)
    )  # "salary" | "commission"
    salary_rate: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2)
    )  # e.g., 25.00 per hour/week/month
    salary_period: Mapped[str | None] = mapped_column(
        String(10)
    )  # "hour" | "week" | "month"
    commission_percent: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2)
    )  # e.g., 50.00 for 50%
    tip_percent: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), default=100
    )  # default 100% of tips
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    role: Mapped["BusinessUserRole"] = relationship(back_populates="business_users")
    business: Mapped["Business"] = relationship(back_populates="business_users")
    appointments: Mapped[list["Appointment"]] = relationship(
        back_populates="staff_member", foreign_keys="Appointment.staff_id"
    )
    services: Mapped[list["Service"]] = relationship(
        secondary="service_staff", back_populates="staff_members"
    )
    availability: Mapped[list["StaffAvailability"]] = relationship(
        back_populates="business_user", cascade="all, delete-orphan"
    )

    @property
    def role_name(self) -> str | None:
        """Convenience to access the role name directly."""
        return self.role.name if self.role else None

    def __repr__(self) -> str:
        role_name = self.role.name if self.role else "unknown"
        return f"<BusinessUser(id={self.id}, email='{self.email}', role='{role_name}')>"
