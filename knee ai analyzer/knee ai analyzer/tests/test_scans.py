import io
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.database import get_db
from app.models.scan import Scan
from app.core.config import settings

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


def test_upload_valid_supported_file():
    """1. Upload valid supported .nii.gz file to patient."""
    # Create patient
    p_res = client.post("/patients", json={"patient_code": "P_SCAN_01", "name": "Scan Test Patient", "age": 45, "sex": "M"})
    patient_id = p_res.json()["id"]

    # Mock medical scan content (binary header)
    file_content = b"\x1f\x8b\x08\x00\x00\x00\x00\x00" + (b"\x00" * 1024)
    file_tuple = ("knee_mri_volume.nii.gz", io.BytesIO(file_content), "application/gzip")

    response = client.post(
        f"/patients/{patient_id}/images",
        files={"file": file_tuple}
    )

    assert response.status_code == 201
    data = response.json()
    assert data["scan_id"] is not None
    assert data["patient_id"] == patient_id
    assert data["original_filename"] == "knee_mri_volume.nii.gz"
    assert data["file_type"] == "nii.gz"
    assert data["file_size"] == len(file_content)
    assert data["status"] == "uploaded"
    assert "uploaded_at" in data

    # Verify physical file exists
    db = TestingSessionLocal()
    scan_in_db = db.query(Scan).filter(Scan.id == data["scan_id"]).first()
    assert scan_in_db is not None
    assert os.path.exists(scan_in_db.file_path)
    db.close()


def test_upload_to_nonexistent_patient():
    """2. Uploading scan to nonexistent patient returns 404."""
    file_content = b"TEST_DICOM_BYTES"
    file_tuple = ("knee.dcm", io.BytesIO(file_content), "application/dicom")

    response = client.post(
        "/patients/88888/images",
        files={"file": file_tuple}
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_upload_unsupported_file_format():
    """3. Uploading unsupported file format (.exe / .txt) returns 400."""
    p_res = client.post("/patients", json={"patient_code": "P_SCAN_02", "name": "Format Test", "age": 30, "sex": "F"})
    patient_id = p_res.json()["id"]

    file_content = b"plain text is not a medical scan"
    file_tuple = ("notes.txt", io.BytesIO(file_content), "text/plain")

    response = client.post(
        f"/patients/{patient_id}/images",
        files={"file": file_tuple}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_upload_empty_file():
    """4. Uploading an empty file returns 400 Bad Request."""
    p_res = client.post("/patients", json={"patient_code": "P_SCAN_03", "name": "Empty File Test", "age": 50, "sex": "M"})
    patient_id = p_res.json()["id"]

    empty_tuple = ("empty_scan.dcm", io.BytesIO(b""), "application/octet-stream")

    response = client.post(
        f"/patients/{patient_id}/images",
        files={"file": empty_tuple}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_verify_physical_file_and_scan_metadata_query():
    """5, 6, 7. Verify physical file creation, DB persistence, and metadata querying via /images/{scan_id}."""
    p_res = client.post("/patients", json={"patient_code": "P_SCAN_04", "name": "Verify Patient", "age": 52, "sex": "F"})
    patient_id = p_res.json()["id"]

    sample_dcm = b"DICM" + (b"\x01" * 512)
    file_tuple = ("sagittal_knee.dcm", io.BytesIO(sample_dcm), "application/dicom")

    upload_res = client.post(
        f"/patients/{patient_id}/images",
        files={"file": file_tuple}
    )
    assert upload_res.status_code == 201
    scan_id = upload_res.json()["scan_id"]

    # Query scan via /images/{scan_id}
    meta_res = client.get(f"/images/{scan_id}")
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["scan_id"] == scan_id
    assert meta["patient_id"] == patient_id
    assert meta["original_filename"] == "sagittal_knee.dcm"
    assert meta["file_type"] == "dcm"
    assert meta["file_size"] == len(sample_dcm)

    # List scans for patient via /patients/{patient_id}/images
    list_res = client.get(f"/patients/{patient_id}/images")
    assert list_res.status_code == 200
    scans_list = list_res.json()
    assert len(scans_list) == 1
    assert scans_list[0]["scan_id"] == scan_id
