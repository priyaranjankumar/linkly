# backend/tests/test_main.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import logging
import fakeredis # <<< IMPORT FAKEREDIS

# Adjust imports if your structure differs
from app.main import app, get_db
# --- Import get_redis dependency ---
from app.cache import get_redis
from app.database import Base
from app.models import LinkStatus # Import LinkStatus

# Configure basic logging for tests
logging.basicConfig(level=logging.DEBUG) # Use DEBUG to see more info
logger = logging.getLogger(__name__)

# --- Database Setup for Testing ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:" # Use in-memory SQLite

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}, # Required for SQLite
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables once for all tests
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    logger.info("Setting up test database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Test database schema setup complete.")
    yield
    # Optional: Base.metadata.drop_all(bind=engine) if needed

# --- Dependency Overrides ---
def override_get_db():
    """Dependency override for test database sessions."""
    database = None
    try:
        # logger.debug("Creating test DB session.") # Can add if needed
        database = TestingSessionLocal()
        yield database
    finally:
        if database:
            # logger.debug("Closing test DB session.") # Can add if needed
            database.close()

# --- Override Redis with FakeRedis ---
@pytest.fixture(scope="session") # Use session scope for fake redis instance
def fake_redis_server():
    # Use FakeServer for a more complete simulation if needed,
    # or just FakeStrictRedis for simpler cases.
    logger.debug("Creating FakeRedis server.")
    server = fakeredis.FakeServer()
    return server

# This fixture depends on fake_redis_server and overrides get_redis
# It needs to be defined *before* app.dependency_overrides uses it
# or used implicitly via pytest's dependency injection mechanism if applied later
@pytest.fixture
def override_redis_dependency(fake_redis_server: fakeredis.FakeServer):
    """Fixture to override the get_redis dependency for the duration of a test."""
    def override_get_redis_with_fake():
        # Create a new fake client connected to the fake server for each test
        # decode_responses=True matches the setting in the real cache.py
        client = fakeredis.FakeStrictRedis(server=fake_redis_server, decode_responses=True)
        # Ensure the client is flushed before each test function
        client.flushall()
        logger.debug("Providing FakeRedis client.")
        try:
            yield client
        finally:
            client.flushall() # Optional: Clear after test

    original_override = app.dependency_overrides.get(get_redis)
    app.dependency_overrides[get_redis] = override_get_redis_with_fake
    yield # Let the test run with the override
    # Restore original override or remove it after the test
    if original_override:
        app.dependency_overrides[get_redis] = original_override
    else:
        del app.dependency_overrides[get_redis]


# Apply the DB override globally
app.dependency_overrides[get_db] = override_get_db

# --- Test Client ---
@pytest.fixture
def client(override_redis_dependency): # <<< Make client depend on the redis override fixture
     # Now the override_redis_dependency fixture ensures Redis is mocked before client is created
     logger.debug("--- Registered Routes Before Test ---")
     route_list = []
     for route in app.routes:
         route_info = f"Path: {route.path}, Name: {getattr(route, 'name', 'N/A')}, Methods: {getattr(route, 'methods', None)}"
         route_list.append(route_info)
         logger.debug(route_info)
     logger.debug("-----------------------------------")
     # Basic check if the route path exists at all
     if not any("/api/health" in r for r in route_list):
         logger.error("CRITICAL: /api/health route path not found in registered routes!")

     yield TestClient(app)


# --- Test Functions ---

def test_health_check(client):
    logger.debug("--- Running test_health_check ---")
    request_path = "/api/health"
    logger.debug(f"Requesting path: {request_path}")
    response = client.get(request_path)
    logger.debug(f"Health check response status: {response.status_code}")
    logger.debug(f"Health check response body: {response.text}")
    assert response.status_code == 200 # Expect 200
    assert response.json() == {"status": "ok", "message": "Linkly backend is healthy"} # Ensure assertion matches actual response

# --- Updated Test ---
def test_shorten_url_success(client):
    logger.debug("--- Running test_shorten_url_success ---")
    test_url = "https://www.google.com/"
    response = client.post("/api/shorten", json={"url": test_url})
    logger.debug(f"Shorten response status: {response.status_code}")
    logger.debug(f"Shorten response body: {response.text}") # Log body to see generated URL
    assert response.status_code == 201
    data = response.json()
    assert data["original_url"] == test_url
    assert "short_code" in data
    assert isinstance(data["short_code"], str) and len(data["short_code"]) > 0
    assert data["status"] == LinkStatus.ACTIVE.value
    assert "short_url" in data
    assert data["short_code"] in data["short_url"]
    # --- UPDATE ASSERTION HERE ---
    # Expect the fallback URL from utils.py since .env is not loaded during build
    expected_base_url = "http://localhost:3000"
    assert data["short_url"].startswith(expected_base_url), f"Expected URL to start with {expected_base_url} but got {data['short_url']}"
    logger.info("test_shorten_url_success passed assertions.")


def test_redirect_success(client):
    logger.debug("--- Running test_redirect_success ---")
    test_url = "https://www.example.com/path?query=1"
    # 1. Create a link
    create_response = client.post("/api/shorten", json={"url": test_url})
    assert create_response.status_code == 201, f"Failed to create link: {create_response.text}"
    short_code = create_response.json()["short_code"]
    assert short_code is not None

    # 2. Attempt redirect (mocked Redis should be checked by the endpoint now)
    logger.debug(f"Attempting redirect for short code: {short_code}")
    redirect_response = client.get(f"/{short_code}", follow_redirects=False)
    logger.debug(f"Redirect response status: {redirect_response.status_code}")
    logger.debug(f"Redirect response headers: {redirect_response.headers}")
    assert redirect_response.status_code == 307
    assert redirect_response.headers["location"] == test_url

def test_shorten_invalid_url(client):
    response = client.post("/api/shorten", json={"url": "not-a-valid-url"})
    assert response.status_code == 422

def test_shorten_missing_url_payload(client):
    response = client.post("/api/shorten", json={})
    assert response.status_code == 422

def test_redirect_not_found(client):
    response = client.get("/nonexistentcode123", follow_redirects=False)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()