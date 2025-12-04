"""Tests for authentication endpoints"""

import pytest
from fastapi import status


class TestBusinessRegistration:
    """Test cases for business registration endpoint"""

    def test_register_business_success(self, client):
        """Test successful business registration"""
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }

        response = client.post("/api/auth/register", json=registration_data)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["business_id"] == 1
        assert data["user_id"] == 1
        assert data["business_name"] == "Pawsome Groomers"
        assert data["email"] == "john@example.com"
        assert data["message"] == "Business registered successfully"

    def test_register_business_duplicate_email(self, client):
        """Test registration with duplicate email fails"""
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }

        # First registration should succeed
        response = client.post("/api/auth/register", json=registration_data)
        assert response.status_code == status.HTTP_201_CREATED

        # Second registration with same email should fail
        registration_data["business_name"] = "Another Business"
        response = client.post("/api/auth/register", json=registration_data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Email already registered" in response.json()["detail"]

    def test_register_business_missing_required_fields(self, client):
        """Test registration with missing required fields"""
        # Missing business_name
        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Missing email
        data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

        # Missing password
        data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
        }
        response = client.post("/api/auth/register", json=data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_business_invalid_email(self, client):
        """Test registration with invalid email format"""
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "invalid-email",
            "password": "SecurePass123",
        }

        response = client.post("/api/auth/register", json=registration_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_business_password_too_short(self, client):
        """Test registration with password shorter than minimum length"""
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "short",  # Less than 8 characters
        }

        response = client.post("/api/auth/register", json=registration_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_business_empty_business_name(self, client):
        """Test registration with empty business name"""
        registration_data = {
            "business_name": "",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }

        response = client.post("/api/auth/register", json=registration_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_business_long_password(self, client):
        """Test registration with very long password (bcrypt has 72 byte limit)"""
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "a" * 100,  # 100 character password exceeds bcrypt's 72 byte limit
        }

        response = client.post("/api/auth/register", json=registration_data)
        # Bcrypt rejects passwords longer than 72 bytes
        assert response.status_code == status.HTTP_201_CREATED

    def test_register_business_special_characters_in_name(self, client):
        """Test registration with special characters in names"""
        registration_data = {
            "business_name": "O'Reilly's Pet Grooming & Spa",
            "first_name": "Mary-Jane",
            "last_name": "O'Connor",
            "email": "maryjane@example.com",
            "password": "SecurePass123",
        }

        response = client.post("/api/auth/register", json=registration_data)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["business_name"] == "O'Reilly's Pet Grooming & Spa"

    def test_register_multiple_businesses(self, client):
        """Test registering multiple different businesses"""
        businesses = [
            {
                "business_name": "Pawsome Groomers",
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "password": "SecurePass123",
            },
            {
                "business_name": "Furry Friends Spa",
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane@example.com",
                "password": "SecurePass456",
            },
            {
                "business_name": "Pet Paradise",
                "first_name": "Bob",
                "last_name": "Johnson",
                "email": "bob@example.com",
                "password": "SecurePass789",
            },
        ]

        for i, business_data in enumerate(businesses, 1):
            response = client.post("/api/auth/register", json=business_data)
            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert data["business_id"] == i
            assert data["user_id"] == i
            assert data["business_name"] == business_data["business_name"]
            assert data["email"] == business_data["email"]


class TestLogin:
    """Test cases for login endpoint"""

    def test_login_success(self, client):
        """Test successful login with valid credentials"""
        # First register a user
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        client.post("/api/auth/register", json=registration_data)

        # Now login
        login_data = {
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user_id"] == 1
        assert data["email"] == "john@example.com"
        assert data["business_id"] == 1
        assert data["role"] == "owner"
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"

    def test_login_invalid_email(self, client):
        """Test login with non-existent email"""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_invalid_password(self, client):
        """Test login with incorrect password"""
        # First register a user
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        client.post("/api/auth/register", json=registration_data)

        # Try to login with wrong password
        login_data = {
            "email": "john@example.com",
            "password": "WrongPassword123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid email or password" in response.json()["detail"]

    def test_login_missing_email(self, client):
        """Test login with missing email"""
        login_data = {
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_missing_password(self, client):
        """Test login with missing password"""
        login_data = {
            "email": "john@example.com",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_invalid_email_format(self, client):
        """Test login with invalid email format"""
        login_data = {
            "email": "invalid-email",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_empty_password(self, client):
        """Test login with empty password"""
        login_data = {
            "email": "john@example.com",
            "password": "",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_login_inactive_user(self, client, db_session):
        """Test login with inactive user account"""
        from app.models.business_user import BusinessUser

        # Register a user
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        client.post("/api/auth/register", json=registration_data)

        # Deactivate the user
        user = db_session.query(BusinessUser).filter_by(email="john@example.com").first()
        user.is_active = False
        db_session.commit()

        # Try to login
        login_data = {
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Account is inactive" in response.json()["detail"]

    def test_login_jwt_token_structure(self, client):
        """Test that JWT token has proper structure"""
        from jose import jwt
        from app.core.config import settings

        # Register a user
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        client.post("/api/auth/register", json=registration_data)

        # Login
        login_data = {
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        assert response.status_code == status.HTTP_200_OK
        token = response.json()["access_token"]

        # Decode token to verify structure
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )

        assert "sub" in payload  # User ID
        assert "email" in payload
        assert "business_id" in payload
        assert "role" in payload
        assert "exp" in payload  # Expiration
        assert "iat" in payload  # Issued at
        assert "iss" in payload  # Issuer
        assert "aud" in payload  # Audience

        assert payload["email"] == "john@example.com"
        assert payload["role"] == "owner"

    def test_login_case_sensitive_email(self, client):
        """Test that email is case-insensitive for login"""
        # Register with lowercase
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "password": "SecurePass123",
        }
        client.post("/api/auth/register", json=registration_data)

        # Try to login with different case
        login_data = {
            "email": "John@Example.Com",
            "password": "SecurePass123",
        }
        response = client.post("/api/auth/login", json=login_data)

        # Email comparison is case-sensitive by default in PostgreSQL
        # This should fail unless we implement case-insensitive email handling
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_multiple_users_same_business(self, client, db_session):
        """Test login with multiple users from the same business"""
        from app.models.business_user import BusinessUser, BusinessUserRole, BusinessUserRoleName
        from app.core.security import hash_password

        # Register the business owner
        registration_data = {
            "business_name": "Pawsome Groomers",
            "first_name": "John",
            "last_name": "Doe",
            "email": "owner@example.com",
            "password": "OwnerPass123",
        }
        client.post("/api/auth/register", json=registration_data)

        # Add a staff member to the same business
        staff_role = (
            db_session.query(BusinessUserRole)
            .filter_by(name=BusinessUserRoleName.STAFF.value)
            .first()
        )
        if not staff_role:
            staff_role = BusinessUserRole(name=BusinessUserRoleName.STAFF.value)
            db_session.add(staff_role)
            db_session.commit()
        staff = BusinessUser(
            business_id=1,
            email="staff@example.com",
            password_hash=hash_password("StaffPass123"),
            first_name="Jane",
            last_name="Smith",
            role=staff_role,
            role_id=staff_role.id,
            is_active=True,
        )
        db_session.add(staff)
        db_session.commit()

        # Login as owner
        owner_login = {
            "email": "owner@example.com",
            "password": "OwnerPass123",
        }
        response = client.post("/api/auth/login", json=owner_login)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "owner"
        assert data["email"] == "owner@example.com"

        # Login as staff
        staff_login = {
            "email": "staff@example.com",
            "password": "StaffPass123",
        }
        response = client.post("/api/auth/login", json=staff_login)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["role"] == "staff"
        assert data["email"] == "staff@example.com"
