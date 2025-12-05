"""Time block model for groomer schedule blocking"""

from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TimeBlock(Base):
    """Time block for non-appointment schedule blocking (lunch, meetings, etc.)"""

    __tablename__ = "time_blocks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    staff_id: Mapped[int] = mapped_column(
        ForeignKey("business_users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    block_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    business: Mapped["Business"] = relationship()
    staff_member: Mapped["BusinessUser"] = relationship()

    def __repr__(self) -> str:
        return f"<TimeBlock(id={self.id}, staff_id={self.staff_id}, datetime='{self.block_datetime}', reason='{self.reason}')>"
