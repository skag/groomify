"""Authentication and registration schemas"""

from pydantic import BaseModel, EmailStr, Field


class BusinessRegistration(BaseModel):
    """Schema for business registration (signup)"""

    business_name: str = Field(..., min_length=1, max_length=255)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class BusinessRegistrationResponse(BaseModel):
    """Response after successful business registration"""

    business_id: int
    user_id: int
    business_name: str
    email: str
    message: str = "Business registered successfully"


class LoginRequest(BaseModel):
    """Schema for login request"""

    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Response after successful login"""

    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    business_id: int
    role: str
    first_name: str
    last_name: str
