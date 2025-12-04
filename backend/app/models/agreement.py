"""Agreement model for storing contract-like documents with signing rules."""

from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.core.database import Base


class SigningOption(str, enum.Enum):
    """How frequently the agreement must be signed."""

    ONCE = "once"
    EVERY = "every"
    MANUAL = "manual"


class AgreementStatus(str, enum.Enum):
    """Status of the agreement."""

    ACTIVE = "active"
    DRAFT = "draft"
    ARCHIVED = "archived"


class Agreement(Base):
    """Agreement content with a signing requirement."""

    __tablename__ = "agreements"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    business_id: Mapped[int] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)  # rich text / HTML supported
    signing_option: Mapped[SigningOption] = mapped_column(
        SQLEnum(SigningOption), nullable=False, default=SigningOption.ONCE
    )
    status: Mapped[AgreementStatus] = mapped_column(
        SQLEnum(AgreementStatus), nullable=False, default=AgreementStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<Agreement(id={self.id}, name='{self.name}', signing_option='{self.signing_option}')>"
