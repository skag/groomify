"""Pytest configuration and fixtures"""

import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.core.database import Base, get_db
from app.web_app import app

# Load environment variables
load_dotenv()

# Use PostgreSQL test database from environment
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", "postgresql://postgres:admin@localhost:5432/groomify_test"
)

engine = create_engine(TEST_DATABASE_URL, echo=False)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test"""
    # Create all tables before test
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
        # Clean up all data after test (keeps schema)
        cleanup_session = TestingSessionLocal()
        try:
            # Delete all data from tables in reverse order (respects foreign keys)
            for table in reversed(Base.metadata.sorted_tables):
                cleanup_session.execute(table.delete())
            # Reset sequences for PostgreSQL
            for table in Base.metadata.sorted_tables:
                if hasattr(table, 'name'):
                    # Reset the auto-increment sequence
                    cleanup_session.execute(
                        text(f"ALTER SEQUENCE {table.name}_id_seq RESTART WITH 1")
                    )
            cleanup_session.commit()
        finally:
            cleanup_session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with overridden database dependency"""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
