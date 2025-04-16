import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module")
def test_user():
    return {"email": "testuser@example.com", "password": "testpass123"}

@pytest.fixture(scope="module")
def test_user2():
    return {"email": "otheruser@example.com", "password": "otherpass123"}

def test_register_and_login(test_user):
    # Register
    r = client.post("/api/auth/register", json=test_user)
    assert r.status_code == 200
    # Duplicate registration
    r2 = client.post("/api/auth/register", json=test_user)
    assert r2.status_code == 400
    # Login
    r3 = client.post("/api/auth/login", json=test_user)
    assert r3.status_code == 200
    assert "access_token" in r3.json()
    # Wrong password
    r4 = client.post("/api/auth/login", json={"email": test_user["email"], "password": "wrong"})
    assert r4.status_code == 400

def test_link_crud_and_ownership(test_user, test_user2):
    # Register and login user1
    client.post("/api/auth/register", json=test_user)
    login1 = client.post("/api/auth/login", json=test_user)
    token1 = login1.json()["access_token"]
    headers1 = {"Authorization": f"Bearer {token1}"}
    # Register and login user2
    client.post("/api/auth/register", json=test_user2)
    login2 = client.post("/api/auth/login", json=test_user2)
    token2 = login2.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    # User1 creates a link
    r = client.post("/api/links/shorten", json={"url": "https://example.com"}, headers=headers1)
    assert r.status_code == 200 or r.status_code == 201
    link_id = r.json()["id"]
    # User1 can list their link
    r2 = client.get("/api/links/", headers=headers1)
    assert r2.status_code == 200
    assert any(l["id"] == link_id for l in r2.json()["links"])
    # User2 cannot delete user1's link
    r3 = client.delete(f"/api/links/{link_id}", headers=headers2)
    assert r3.status_code == 404 or r3.status_code == 403
    # User1 can delete their link
    r4 = client.delete(f"/api/links/{link_id}", headers=headers1)
    assert r4.status_code == 204
    # User1 cannot delete again
    r5 = client.delete(f"/api/links/{link_id}", headers=headers1)
    assert r5.status_code == 404
