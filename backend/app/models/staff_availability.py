"""Staff availability model for weekly work schedules"""

from datetime import datetime, time, timezone
from sqlalchemy import Integer, Boolean, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class StaffAvailability(Base):
    """Weekly availability schedule for staff members"""

    __tablename__ = "staff_availability"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_user_id: Mapped[int] = mapped_column(
        ForeignKey("business_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_of_week: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    start_time: Mapped[time | None] = mapped_column(Time)  # e.g., 09:00
    end_time: Mapped[time | None] = mapped_column(Time)  # e.g., 17:00
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    business_user: Mapped["BusinessUser"] = relationship(back_populates="availability")

    # Unique constraint: one entry per staff per day
    __table_args__ = (
        UniqueConstraint("business_user_id", "day_of_week", name="uq_staff_day"),
    )

    def __repr__(self) -> str:
        day_names = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        day_name = day_names[self.day_of_week] if 0 <= self.day_of_week <= 6 else "?"
        return f"<StaffAvailability(user_id={self.business_user_id}, day={day_name}, available={self.is_available})>"
