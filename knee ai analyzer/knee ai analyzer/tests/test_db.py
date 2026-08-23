import pytest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.base import Base
from app.models.patient import Patient
from app.models.scan import Scan
from app.schemas.patient import PatientCreate, PatientResponse
from app.schemas.scan import ScanResponse


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database session for unit testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_database_table_creation(db_session):
    """Test that 'patients' and 'scans' tables are created successfully."""
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    assert "patients" in tables
    assert "scans" in tables


def test_patient_model_and_schema(db_session):
    """Test creating, saving, and querying a Patient record with validation."""
    patient_in = PatientCreate(
        patient_code="PAT-2026-001",
        name="John Doe",
        age=58,
        sex="M",
    )

    db_patient = Patient(
        patient_code=patient_in.patient_code,
        name=patient_in.name,
        age=patient_in.age,
        sex=patient_in.sex,
    )
    db_session.add(db_patient)
    db_session.commit()
    db_session.refresh(db_patient)

    assert db_patient.id is not None
    assert db_patient.patient_code == "PAT-2026-001"
    assert db_patient.name == "John Doe"
    assert db_patient.age == 58
    assert db_patient.sex == "M"
    assert db_patient.created_at is not None

    # Verify Pydantic response conversion
    response_dto = PatientResponse.model_validate(db_patient)
    assert response_dto.id == db_patient.id
    assert response_dto.patient_code == "PAT-2026-001"


def test_scan_model_and_relationship(db_session):
    """Test creating a scan associated with a patient."""
    db_patient = Patient(
        patient_code="PAT-2026-002",
        name="Alice Smith",
        age=49,
        sex="F",
    )
    db_session.add(db_patient)
    db_session.commit()
    db_session.refresh(db_patient)

    db_scan = Scan(
        patient_id=db_patient.id,
        file_path="/mock/path/knee.nii.gz",
        original_filename="knee.nii.gz",
        file_type="nii.gz",
        file_size=2048,
        status="uploaded"
    )
    db_session.add(db_scan)
    db_session.commit()
    db_session.refresh(db_scan)

    assert db_scan.id is not None
    assert db_scan.patient_id == db_patient.id
    assert len(db_patient.scans) == 1

    # Validate Scan schema
    scan_resp = ScanResponse.model_validate(db_scan)
    assert scan_resp.scan_id == db_scan.id
    assert scan_resp.original_filename == "knee.nii.gz"
