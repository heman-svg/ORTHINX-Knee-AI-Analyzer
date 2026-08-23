import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.database import get_db

# In-memory test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


client = TestClient(app)


def test_create_patient():
    """1. Create a patient successfully."""
    payload = {
        "patient_code": "P001",
        "name": "Demo Patient",
        "age": 55,
        "sex": "M"
    }
    response = client.post("/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["patient_code"] == "P001"
    assert data["name"] == "Demo Patient"
    assert data["age"] == 55
    assert data["sex"] == "M"
    assert "id" in data
    assert "created_at" in data


def test_create_duplicate_patient():
    """2. Create duplicate patient code should fail with 400 Bad Request."""
    payload = {
        "patient_code": "DUP001",
        "name": "First Patient",
        "age": 42,
        "sex": "F"
    }
    res1 = client.post("/patients", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/patients", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


def test_list_patients():
    """3. List all patients with pagination."""
    client.post("/patients", json={"patient_code": "P010", "name": "Patient 10", "age": 30, "sex": "M"})
    client.post("/patients", json={"patient_code": "P020", "name": "Patient 20", "age": 40, "sex": "F"})

    response = client.get("/patients?skip=0&limit=10")
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) >= 2
    codes = [p["patient_code"] for p in patients]
    assert "P010" in codes
    assert "P020" in codes


def test_get_patient():
    """4. Get an existing patient by ID."""
    created = client.post("/patients", json={"patient_code": "P030", "name": "Jane Doe", "age": 63, "sex": "F"}).json()
    patient_id = created["id"]

    response = client.get(f"/patients/{patient_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == patient_id
    assert data["patient_code"] == "P030"
    assert data["name"] == "Jane Doe"


def test_get_nonexistent_patient():
    """5. Get non-existent patient returns 404."""
    response = client.get("/patients/99999")
    assert response.status_code == 404
    assert "does not exist" in response.json()["detail"]


def test_update_patient():
    """6. Update patient name, age, and sex."""
    created = client.post("/patients", json={"patient_code": "P040", "name": "Original Name", "age": 50, "sex": "M"}).json()
    patient_id = created["id"]

    update_payload = {
        "name": "Updated Name",
        "age": 51,
        "sex": "M"
    }
    response = client.put(f"/patients/{patient_id}", json=update_payload)
    assert response.status_code == 200
    updated_data = response.json()
    assert updated_data["name"] == "Updated Name"
    assert updated_data["age"] == 51


def test_delete_patient():
    """7. Delete patient safely."""
    created = client.post("/patients", json={"patient_code": "P050", "name": "To Delete", "age": 70, "sex": "Other"}).json()
    patient_id = created["id"]

    del_response = client.delete(f"/patients/{patient_id}")
    assert del_response.status_code == 200
    assert del_response.json()["patient_id"] == patient_id

    # Verify patient no longer exists
    get_response = client.get(f"/patients/{patient_id}")
    assert get_response.status_code == 404
