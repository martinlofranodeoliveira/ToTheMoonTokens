import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from tothemoon_api.database import Base
from tothemoon_api.db_models import User, ApiKey

# Setup an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Create the tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    # Teardown the tables
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_create_user_and_api_key(db_session):
    # Test User creation
    test_user = User(email="test@example.com")
    db_session.add(test_user)
    db_session.commit()
    db_session.refresh(test_user)

    assert test_user.id is not None
    assert test_user.email == "test@example.com"

    # Test ApiKey creation
    test_api_key = ApiKey(key="test_api_key_123", user_id=test_user.id)
    db_session.add(test_api_key)
    db_session.commit()
    db_session.refresh(test_api_key)

    assert test_api_key.id is not None
    assert test_api_key.key == "test_api_key_123"
    assert test_api_key.user_id == test_user.id

    # Test relationship
    assert len(test_user.api_keys) == 1
    assert test_user.api_keys[0].key == "test_api_key_123"
    assert test_api_key.owner.email == "test@example.com"
