from fastapi.testclient import TestClient

from app.main import app


def test_protected_routes_require_auth():
    client = TestClient(app)
    resp = client.get("/api/tracks")
    assert resp.status_code == 401


def test_health_is_public():
    client = TestClient(app)
    resp = client.get("/api/health")
    assert resp.status_code == 200


def test_login_requires_credentials():
    client = TestClient(app)
    resp = client.post("/api/auth/login", json={"username": "demo", "password": "demo"})
    assert resp.status_code == 401
