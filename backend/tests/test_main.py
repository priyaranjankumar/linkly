# backend/tests/test_main.py

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import logging
import fakeredis
import json
from urllib.parse import urljoin # Import urljoin

# Adjust imports
from app.main import app, get_db, build_cache_key, DEFAULT_CACHE_TTL_SECONDS, FRONTEND_BASE_URL # Import FRONTEND_BASE_URL
from app.cache import get_redis
from app.database import Base
from app import models
from app.models import LinkStatus
from app.dependencies import get_current_user

# Configure basic logging for tests
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# --- Database Setup for Testing (remains the same) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    logger.info("Setting up test database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Test database schema setup complete.")
    yield

@pytest.fixture(autouse=True)
def clean_tables():
    with engine.connect() as connection:
        transaction = connection.begin()
        for table in reversed(Base.metadata.sorted_tables):
            connection.execute(table.delete())
        transaction.commit()

# --- Dependency Overrides (remains the same) ---
def override_get_db():
    database = None
    try:
        database = TestingSessionLocal()
        yield database
    finally:
        if database:
            database.close()

# --- Fake Redis Setup (remains the same) ---
@pytest.fixture(scope="session")
def fake_redis_server():
    logger.debug("Creating FakeRedis server for test session.")
    server = fakeredis.FakeServer()
    return server

@pytest.fixture
def fake_redis_client(fake_redis_server: fakeredis.FakeServer):
    client = fakeredis.FakeStrictRedis(server=fake_redis_server, decode_responses=True)
    client.flushall()
    yield client
    client.flushall()

@pytest.fixture(autouse=True)
def override_redis_dependency(fake_redis_client: fakeredis.FakeStrictRedis):
    def override_get_redis_with_fake():
        yield fake_redis_client
    original_override = app.dependency_overrides.get(get_redis)
    app.dependency_overrides[get_redis] = override_get_redis_with_fake
    yield
    if original_override:
        app.dependency_overrides[get_redis] = original_override
    else:
        if get_redis in app.dependency_overrides:
            del app.dependency_overrides[get_redis]

app.dependency_overrides[get_db] = override_get_db

# --- Dummy User for Auth Override ---
class DummyUser:
    def __init__(self):
        self.id = 1
        self.email = "testuser@example.com"

@pytest.fixture(autouse=True, scope="session")
def override_current_user():
    def _get_current_user_override():
        return DummyUser()
    app.dependency_overrides[get_current_user] = _get_current_user_override
    yield
    app.dependency_overrides.pop(get_current_user, None)

# --- Test Client (remains the same) ---
@pytest.fixture
def client():
    logger.debug("Creating TestClient.")
    import os
    original_testing_val = os.environ.get("TESTING")
    os.environ["TESTING"] = "true"
    with TestClient(app) as test_client:
        yield test_client
    if original_testing_val is None:
        del os.environ["TESTING"]
    else:
        os.environ["TESTING"] = original_testing_val


# --- Test Functions ---

# --- health_check, shorten tests, redirect_success, redirect_not_found (remain the same) ---
def test_health_check(client: TestClient):
    logger.debug("--- Running test_health_check ---")
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "Linkly backend is healthy"}

def test_shorten_url_success(client: TestClient, fake_redis_client: fakeredis.FakeStrictRedis):
    logger.debug("--- Running test_shorten_url_success ---")
    test_url = "https://www.google.com/"
    response = client.post("/api/shorten", json={"url": test_url})
    assert response.status_code == 201
    data = response.json()
    assert data["original_url"] == test_url
    assert "short_code" in data and data["short_code"]
    assert data["status"] == LinkStatus.ACTIVE.value
    assert data["visit_count"] == 0
    assert "short_url" in data and data["short_code"] in data["short_url"]
    cache_key = build_cache_key(data["short_code"])
    cached_value_str = fake_redis_client.get(cache_key)
    assert cached_value_str is not None
    cached_data = json.loads(cached_value_str)
    assert cached_data["url"] == test_url
    assert cached_data["status"] == LinkStatus.ACTIVE.value
    ttl = fake_redis_client.ttl(cache_key)
    assert -1 < ttl <= DEFAULT_CACHE_TTL_SECONDS
    logger.info("test_shorten_url_success passed.")

def test_shorten_invalid_url(client: TestClient):
    response = client.post("/api/shorten", json={"url": "not-a-valid-url"})
    assert response.status_code == 422

def test_shorten_missing_url_payload(client: TestClient):
    response = client.post("/api/shorten", json={})
    assert response.status_code == 422

def test_redirect_success_and_count_increment(client: TestClient, fake_redis_client: fakeredis.FakeStrictRedis):
    logger.debug("--- Running test_redirect_success_and_count_increment ---")
    test_url = "https://www.example.com/path?query=1"
    create_response = client.post("/api/shorten", json={"url": test_url})
    assert create_response.status_code == 201
    short_code = create_response.json()["short_code"]
    cache_key = build_cache_key(short_code)
    assert fake_redis_client.exists(cache_key)
    redirect_response_1 = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response_1.status_code == 307
    assert redirect_response_1.headers["location"] == test_url
    details_response_1 = client.get(f"/api/links/{short_code}")
    assert details_response_1.status_code == 200
    assert details_response_1.json()["visit_count"] == 1
    fake_redis_client.delete(cache_key)
    assert not fake_redis_client.exists(cache_key)
    redirect_response_2 = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_response_2.status_code == 307
    assert redirect_response_2.headers["location"] == test_url
    assert fake_redis_client.exists(cache_key)
    cached_value_str = fake_redis_client.get(cache_key)
    assert cached_value_str is not None
    cached_data = json.loads(cached_value_str)
    assert cached_data["url"] == test_url
    assert cached_data["status"] == LinkStatus.ACTIVE.value
    details_response_2 = client.get(f"/api/links/{short_code}")
    assert details_response_2.status_code == 200
    assert details_response_2.json()["visit_count"] == 2
    logger.info("test_redirect_success_and_count_increment passed.")

def test_redirect_not_found(client: TestClient):
    logger.debug("--- Running test_redirect_not_found ---")
    response = client.get("/nonexistentcode123", follow_redirects=False)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

# --- FIX: Update assertions for inactive link redirect ---
def test_redirect_inactive_link(client: TestClient):
    logger.debug("--- Running test_redirect_inactive_link ---")
    test_url = "https://www.inactive.com/"
    # 1. Create link
    create_resp = client.post("/api/shorten", json={"url": test_url})
    assert create_resp.status_code == 201
    short_code = create_resp.json()["short_code"]

    # 2. Set link to Inactive
    update_resp = client.patch(
        f"/api/links/{short_code}/status",
        json={"status": LinkStatus.INACTIVE.value}
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == LinkStatus.INACTIVE.value

    # 3. Attempt redirect - Expect 302 to frontend inactive page
    redirect_resp = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_resp.status_code == 302 # <-- CHANGED: Expect 302 Found
    # Check the Location header points to the frontend inactive page
    expected_inactive_url = urljoin(FRONTEND_BASE_URL, f"/inactive?code={short_code}")
    assert redirect_resp.headers["location"] == expected_inactive_url

    # 4. Verify count is still 0
    details_resp = client.get(f"/api/links/{short_code}")
    assert details_resp.status_code == 200
    assert details_resp.json()["visit_count"] == 0

    logger.info("test_redirect_inactive_link passed.")

# --- Status Update Tests (remain the same) ---
def test_update_status_success(client: TestClient, fake_redis_client: fakeredis.FakeStrictRedis):
    logger.debug("--- Running test_update_status_success ---")
    test_url = "https://www.to-be-toggled.com/"
    create_resp = client.post("/api/shorten", json={"url": test_url})
    assert create_resp.status_code == 201
    short_code = create_resp.json()["short_code"]
    cache_key = build_cache_key(short_code)
    cached_value_str = fake_redis_client.get(cache_key)
    assert json.loads(cached_value_str)["status"] == LinkStatus.ACTIVE.value
    update_resp_inactive = client.patch(
        f"/api/links/{short_code}/status",
        json={"status": LinkStatus.INACTIVE.value}
    )
    assert update_resp_inactive.status_code == 200
    assert update_resp_inactive.json()["status"] == LinkStatus.INACTIVE.value
    assert fake_redis_client.get(cache_key) is None
    update_resp_active = client.patch(
        f"/api/links/{short_code}/status",
        json={"status": LinkStatus.ACTIVE.value}
    )
    assert update_resp_active.status_code == 200
    assert update_resp_active.json()["status"] == LinkStatus.ACTIVE.value
    assert fake_redis_client.get(cache_key) is None
    details_resp = client.get(f"/api/links/{short_code}")
    assert details_resp.status_code == 200
    assert details_resp.json()["status"] == LinkStatus.ACTIVE.value
    logger.info("test_update_status_success passed.")

def test_update_status_not_found(client: TestClient):
    logger.debug("--- Running test_update_status_not_found ---")
    update_resp = client.patch(
        "/api/links/nonexistent999/status",
        json={"status": LinkStatus.ACTIVE.value}
    )
    assert update_resp.status_code == 404

def test_update_status_invalid_status_value(client: TestClient):
    logger.debug("--- Running test_update_status_invalid_status_value ---")
    create_resp = client.post("/api/shorten", json={"url": "https://example.com"})
    assert create_resp.status_code == 201
    short_code = create_resp.json()["short_code"]
    update_resp = client.patch(
        f"/api/links/{short_code}/status",
        json={"status": "Pending"}
    )
    assert update_resp.status_code == 422

# --- Cache Interaction Tests ---
def test_redirect_cache_hit_active(client: TestClient, fake_redis_client: fakeredis.FakeStrictRedis):
    logger.debug("--- Running test_redirect_cache_hit_active ---")
    test_url = "https://www.cached-active.com/"
    short_code = "cachehit1"
    cache_key = build_cache_key(short_code)
    cache_data = json.dumps({"url": test_url, "status": LinkStatus.ACTIVE.value})
    fake_redis_client.set(cache_key, cache_data, ex=DEFAULT_CACHE_TTL_SECONDS)
    db = next(override_get_db())
    created_db_entry = False
    try:
        existing = db.query(models.URLMapping).filter_by(short_code=short_code).first()
        if not existing:
            db_url = models.URLMapping(id=101, short_code=short_code, original_url=test_url, status=LinkStatus.ACTIVE, visit_count=0)
            db.add(db_url)
            db.commit()
            created_db_entry = True
        else:
            created_db_entry = True
    except Exception as e:
             pytest.fail(f"Failed to set up DB entry for test_redirect_cache_hit_active: {e}")
    finally:
        db.close()
    assert created_db_entry
    redirect_resp = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_resp.status_code == 307
    assert redirect_resp.headers["location"] == test_url
    details_resp = client.get(f"/api/links/{short_code}")
    assert details_resp.status_code == 200
    assert details_resp.json()["visit_count"] == 1
    logger.info("test_redirect_cache_hit_active passed.")


# --- FIX: Update assertions for inactive cache hit redirect ---
def test_redirect_cache_hit_inactive(client: TestClient, fake_redis_client: fakeredis.FakeStrictRedis):
    logger.debug("--- Running test_redirect_cache_hit_inactive ---")
    test_url = "https://www.cached-inactive.com/"
    short_code = "cachehit0"
    cache_key = build_cache_key(short_code)
    cache_data = json.dumps({"url": test_url, "status": LinkStatus.INACTIVE.value})
    fake_redis_client.set(cache_key, cache_data, ex=DEFAULT_CACHE_TTL_SECONDS)
    logger.debug(f"Manually set cache: {cache_key} -> {cache_data}")

    # Redirect - should hit cache and return 302 to frontend inactive page
    redirect_resp = client.get(f"/{short_code}", follow_redirects=False)
    assert redirect_resp.status_code == 302 # <-- CHANGED: Expect 302 Found
    expected_inactive_url = urljoin(FRONTEND_BASE_URL, f"/inactive?code={short_code}")
    assert redirect_resp.headers["location"] == expected_inactive_url

    logger.info("test_redirect_cache_hit_inactive passed.")


# --- List Endpoint Tests (remain the same) ---
def test_read_links_empty(client: TestClient):
    logger.debug("--- Running test_read_links_empty ---")
    response = client.get("/api/links")
    assert response.status_code == 200
    assert response.json() == {"links": []}

def test_read_links_with_data(client: TestClient):
    logger.debug("--- Running test_read_links_with_data ---")
    url1 = "https://link1.com/"
    url2 = "https://link2.com/"
    resp1 = client.post("/api/shorten", json={"url": url1})
    resp2 = client.post("/api/shorten", json={"url": url2})
    assert resp1.status_code == 201
    assert resp2.status_code == 201
    response = client.get("/api/links")
    assert response.status_code == 200
    data = response.json()
    assert "links" in data
    assert len(data["links"]) == 2
    returned_urls = {link["original_url"] for link in data["links"]}
    expected_urls = {url1, url2}
    assert returned_urls == expected_urls
    link1_data = next((link for link in data["links"] if link["original_url"] == url1), None)
    assert link1_data is not None
    assert link1_data["visit_count"] == 0
    assert link1_data["status"] == LinkStatus.ACTIVE.value
    logger.info("test_read_links_with_data passed.")