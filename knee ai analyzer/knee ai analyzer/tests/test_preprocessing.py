import io
import os
import shutil
import tempfile
from pathlib import Path
import numpy as np
import pytest
from PIL import Image
import nibabel as nib
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, SecondaryCaptureImageStorage, generate_uid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.database import get_db
from app.models.patient import Patient
from app.models.scan import Scan
from app.core.config import settings
from app.services.preprocessing.loader import load_medical_image
from app.services.preprocessing.validator import validate_medical_image
from app.services.preprocessing.metadata import extract_image_metadata
from app.services.preprocessing.normalization import normalize_image
from app.services.preprocessing.resampling import resample_image
from app.services.preprocessing.orientation import reorient_to_canonical
from app.services.preprocessing.pipeline import preprocess_scan, PreprocessingConfig

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


@pytest.fixture
def synthetic_nifti(tmp_path) -> Path:
    """Create a synthetic 3D knee MRI NIfTI volume (32x32x16) with known spacing."""
    data = np.random.uniform(10.0, 500.0, size=(32, 32, 16)).astype(np.float32)
    # Define affine with spacing [0.5, 0.5, 1.0] mm
    affine = np.diag([0.5, 0.5, 1.0, 1.0])
    nii = nib.Nifti1Image(data, affine)
    file_path = tmp_path / "synthetic_knee.nii.gz"
    nib.save(nii, str(file_path))
    return file_path


@pytest.fixture
def synthetic_dicom(tmp_path) -> Path:
    """Create a synthetic DICOM file for testing."""
    file_path = tmp_path / "synthetic_knee.dcm"
    
    file_meta = FileMetaDataset()
    file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian

    ds = FileDataset(str(file_path), {}, file_meta=file_meta, preamble=b"\0" * 128)
    ds.is_little_endian = True
    ds.is_implicit_VR = False

    ds.SOPClassUID = SecondaryCaptureImageStorage
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.Modality = "MR"
    ds.Rows = 32
    ds.Columns = 32
    ds.PixelSpacing = ["0.5", "0.5"]
    ds.SliceThickness = "1.0"
    ds.BitsAllocated = 16
    ds.BitsStored = 16
    ds.HighBit = 15
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.RescaleSlope = 1.0
    ds.RescaleIntercept = 0.0

    arr = (np.random.rand(32, 32) * 1000).astype(np.uint16)
    ds.PixelData = arr.tobytes()
    ds.save_as(str(file_path), write_like_original=False)
    return file_path


@pytest.fixture
def synthetic_png(tmp_path) -> Path:
    """Create a synthetic 2D knee X-ray radiograph PNG."""
    arr = (np.random.rand(64, 64) * 255).astype(np.uint8)
    img = Image.fromarray(arr)
    file_path = tmp_path / "synthetic_xray.png"
    img.save(str(file_path))
    return file_path


# --- Unit Tests for Preprocessing Modules ---

def test_load_and_validate_nifti(synthetic_nifti):
    """1. Test loading and validating a NIfTI 3D volume."""
    img_data = load_medical_image(synthetic_nifti)
    assert img_data.data.shape == (32, 32, 16)
    assert img_data.spacing == (0.5, 0.5, 1.0)
    assert img_data.file_format == "nifti"

    is_valid, err = validate_medical_image(img_data)
    assert is_valid is True
    assert err is None


def test_load_and_validate_dicom(synthetic_dicom):
    """2. Test loading and validating a DICOM file."""
    img_data = load_medical_image(synthetic_dicom)
    assert img_data.data.shape == (32, 32)
    assert img_data.spacing == (0.5, 0.5, 1.0)
    assert img_data.file_format == "dicom"

    is_valid, err = validate_medical_image(img_data)
    assert is_valid is True
    assert err is None


def test_load_and_validate_png(synthetic_png):
    """3. Test loading and validating a 2D radiograph PNG."""
    img_data = load_medical_image(synthetic_png)
    assert img_data.data.shape == (64, 64)
    assert img_data.file_format == "image_2d"

    is_valid, err = validate_medical_image(img_data)
    assert is_valid is True


def test_validator_rejects_uniform_and_nan():
    """4. Validator should reject constant uniform values and NaNs."""
    from app.services.preprocessing.loader import MedicalImageData
    
    # Constant array (no signal)
    const_data = MedicalImageData(data=np.zeros((10, 10), dtype=np.float32))
    is_valid, err = validate_medical_image(const_data)
    assert is_valid is False
    assert "constant uniform" in err.lower()

    # Array with NaN
    nan_arr = np.ones((10, 10), dtype=np.float32)
    nan_arr[0, 0] = np.nan
    nan_data = MedicalImageData(data=nan_arr)
    is_valid_nan, err_nan = validate_medical_image(nan_data)
    assert is_valid_nan is False
    assert "nan" in err_nan.lower()


def test_metadata_extraction(synthetic_nifti):
    """5. Test metadata extraction function."""
    img_data = load_medical_image(synthetic_nifti)
    meta = extract_image_metadata(img_data)
    assert meta["dimensions"] == [32, 32, 16]
    assert meta["num_dimensions"] == 3
    assert meta["spacing"] == [0.5, 0.5, 1.0]
    assert meta["intensity_min"] is not None
    assert meta["intensity_max"] is not None
    assert meta["intensity_mean"] is not None
    assert meta["intensity_std"] is not None


def test_normalization_methods():
    """6. Test min-max, z-score, and percentile-clip normalization."""
    arr = np.array([10.0, 20.0, 30.0, 40.0, 1000.0], dtype=np.float32)
    
    # Min-max
    norm_mm = normalize_image(arr, method="min_max", target_min=0.0, target_max=1.0)
    assert np.isclose(np.min(norm_mm), 0.0)
    assert np.isclose(np.max(norm_mm), 1.0)

    # Z-score
    norm_zs = normalize_image(arr, method="z_score")
    assert np.isclose(np.mean(norm_zs), 0.0, atol=1e-5)
    assert np.isclose(np.std(norm_zs), 1.0, atol=1e-5)

    # Percentile-clip
    norm_pc = normalize_image(arr, method="percentile_clip")
    assert np.min(norm_pc) >= 0.0
    assert np.max(norm_pc) <= 1.0


def test_resampling():
    """7. Test physical voxel spacing resampling."""
    data = np.random.rand(20, 20, 10).astype(np.float32)
    current_spacing = (0.5, 0.5, 1.0)
    target_spacing = (1.0, 1.0, 1.0)

    resampled, new_spacing = resample_image(data, current_spacing, target_spacing)
    # Downsampled by factor of 2 in x and y
    assert resampled.shape == (10, 10, 10)
    assert new_spacing == (1.0, 1.0, 1.0)


def test_pipeline_preprocess_scan(synthetic_nifti, tmp_path):
    """8. Test full preprocessing pipeline on synthetic NIfTI scan."""
    config = PreprocessingConfig(
        normalization_method="min_max",
        target_spacing=(1.0, 1.0, 1.0),
        reorient=True,
    )
    result = preprocess_scan(synthetic_nifti, config=config, output_dir=tmp_path)
    assert result["status"] == "preprocessed"
    assert os.path.exists(result["output_path"])
    assert result["processed_dimensions"] == [16, 16, 16]
    assert result["spacing"] == [1.0, 1.0, 1.0]


# --- API Integration Tests ---

def test_api_get_metadata(synthetic_nifti):
    """9. Test GET /scans/{scan_id}/metadata endpoint."""
    # Create patient & scan in DB
    db = TestingSessionLocal()
    patient = Patient(patient_code="PAT_PRE_01", name="Pre Test", age=50, sex="M")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    scan = Scan(
        patient_id=patient.id,
        file_path=str(synthetic_nifti),
        original_filename="synthetic_knee.nii.gz",
        file_type="nii.gz",
        file_size=1024,
        status="uploaded",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    scan_id = scan.id
    db.close()

    response = client.get(f"/scans/{scan_id}/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["scan_id"] == scan_id
    assert data["dimensions"] == [32, 32, 16]
    assert data["num_dimensions"] == 3
    assert data["spacing"] == [0.5, 0.5, 1.0]
    assert data["file_format"] == "nifti"


def test_api_run_preprocess(synthetic_nifti):
    """10. Test POST /scans/{scan_id}/preprocess endpoint."""
    db = TestingSessionLocal()
    patient = Patient(patient_code="PAT_PRE_02", name="Pre Test 2", age=55, sex="F")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    scan = Scan(
        patient_id=patient.id,
        file_path=str(synthetic_nifti),
        original_filename="synthetic_knee.nii.gz",
        file_type="nii.gz",
        file_size=1024,
        status="uploaded",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    scan_id = scan.id
    db.close()

    req_payload = {
        "normalization_method": "min_max",
        "target_spacing": [1.0, 1.0, 1.0],
        "reorient": True
    }
    response = client.post(f"/scans/{scan_id}/preprocess", json=req_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["scan_id"] == scan_id
    assert data["status"] == "preprocessed"
    assert data["dimensions"] == [16, 16, 16]
    assert data["spacing"] == [1.0, 1.0, 1.0]
    assert "output_file" in data

    # Verify DB update
    db2 = TestingSessionLocal()
    updated_scan = db2.query(Scan).filter(Scan.id == scan_id).first()
    assert updated_scan.status == "preprocessed"
    assert updated_scan.preprocessing_status == "completed"
    assert updated_scan.preprocessed_path is not None
    assert os.path.exists(updated_scan.preprocessed_path)
    db2.close()


def test_api_preprocess_missing_scan():
    """11. Test preprocessing a non-existent scan ID returns 404."""
    response = client.post("/scans/99999/preprocess")
    assert response.status_code == 404
    assert "does not exist" in response.json()["detail"]
