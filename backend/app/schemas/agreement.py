"""Agreement schemas"""

from datetime import datetime
from pydantic import BaseModel, Field

from app.models.agreement import SigningOption, AgreementStatus


class AgreementBase(BaseModel):
    """Base agreement schema"""

    name: str = Field(..., max_length=255, description="Name/title of the agreement")
    content: str = Field(..., description="Rich text/HTML content of the agreement")
    signing_option: SigningOption = Field(
        default=SigningOption.ONCE,
        description="How often the agreement must be signed (once, every, manual)",
    )
    status: AgreementStatus = Field(
        default=AgreementStatus.ACTIVE,
        description="Status of the agreement (active, draft, archived)",
    )

    class Config:
        allow_population_by_field_name = True


class AgreementCreate(AgreementBase):
    """
    Schema for creating an agreement.

    Note: business_id is NOT included in this schema as it comes from the JWT token.
    """

    pass


class AgreementUpdate(BaseModel):
    """Schema for updating an agreement"""

    name: str | None = Field(None, max_length=255)
    content: str | None = None
    signing_option: SigningOption | None = None
    status: AgreementStatus | None = None


class Agreement(AgreementBase):
    """Schema for agreement response"""

    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        allow_population_by_field_name = True
