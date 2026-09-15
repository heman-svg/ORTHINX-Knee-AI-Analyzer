import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test root GET / endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "KneeAI Backend Running"
    assert data["status"] == "healthy"


def test_health_endpoint():
    """Test health GET /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "KneeAI Backend"


def test_docs_accessible():
    """Test Swagger docs /docs and OpenAPI schema /openapi.json are accessible."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "KneeAI Backend"
