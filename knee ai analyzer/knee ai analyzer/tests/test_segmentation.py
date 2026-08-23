import os
from pathlib import Path
import numpy as np
import pytest
import torch
import nibabel as nib
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
from app.services.segmentation.config import SegmentationConfig, get_torch_device
from app.services.segmentation.model import SegmentationModel
from app.services.segmentation.postprocessing import postprocess_logits, keep_largest_component
from app.services.segmentation.inference import run_segmentation

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


def test_device_selection():
    """1. Test PyTorch compute device resolution."""
    cpu_dev = get_torch_device("cpu")
    assert cpu_dev.type == "cpu"

    auto_dev = get_torch_device("auto")
    assert auto_dev.type in ("cuda", "cpu")


def test_model_initialization_and_missing_weights():
    """2. Test model initialization and safe handling of missing weights."""
    config = SegmentationConfig(
        model_type="monai_unet_3d",
        num_classes=4,
        weights_path=Path("non_existent_weights.pth"),
        device="cpu",
    )
    model = SegmentationModel(config)
    assert model.is_available() is False
    status = model.get_status()
    assert status["model_available"] is False
    assert "not available" in status["message"].lower()


def test_postprocessing_logits_extraction():
    """3. Test post-processing logic converting logit tensor to separate anatomical masks."""
    # Synthetic logit tensor: (Batch=1, NumClasses=4, H=10, W=10, D=10)
    logits = torch.zeros((1, 4, 10, 10, 10), dtype=torch.float32)
    # Assign region 1 to femur (class 1)
    logits[0, 1, 0:5, :, :] = 10.0
    # Assign region 2 to tibia (class 2)
    logits[0, 2, 5:8, :, :] = 10.0
    # Assign region 3 to meniscus (class 3)
    logits[0, 3, 8:10, :, :] = 10.0

    masks = postprocess_logits(logits)
    assert "femur" in masks
    assert "tibia" in masks
    assert "meniscus" in masks
    assert "combined" in masks

    assert np.sum(masks["femur"]) == 5 * 10 * 10
    assert np.sum(masks["tibia"]) == 3 * 10 * 10
    assert np.sum(masks["meniscus"]) == 2 * 10 * 10


def test_keep_largest_component_filter():
    """4. Test connected component filtering removing isolated noise voxels."""
    mask = np.zeros((20, 20), dtype=np.uint8)
    # Main component (5x5 = 25 voxels)
    mask[2:7, 2:7] = 1
    # Isolated noise pixel (1 voxel)
    mask[15, 15] = 1

    cleaned = keep_largest_component(mask)
    assert np.sum(cleaned) == 25
    assert cleaned[15, 15] == 0


def test_segmentation_api_requires_preprocessing(tmp_path):
    """5. Test that segmentation fails with 400 if scan is uploaded but not preprocessed."""
    db = TestingSessionLocal()
    patient = Patient(patient_code="PAT_SEG_01", name="Seg Test Patient", age=60, sex="M")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Scan without preprocessed_path
    scan = Scan(
        patient_id=patient.id,
        file_path=str(tmp_path / "raw.nii.gz"),
        original_filename="raw.nii.gz",
        file_type="nii.gz",
        file_size=1000,
        status="uploaded",
        preprocessing_status="pending",
        preprocessed_path=None,
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    scan_id = scan.id
    db.close()

    response = client.post(f"/scans/{scan_id}/segment")
    assert response.status_code == 400
    assert "must be preprocessed" in response.json()["detail"]


def test_segmentation_api_model_unavailable_response(tmp_path):
    """6. Test that POST /scans/{id}/segment returns model_unavailable when weights are absent without faking masks."""
    # Create synthetic preprocessed file
    proc_file = tmp_path / "proc_scan.nii.gz"
    nii = nib.Nifti1Image(np.random.rand(16, 16, 8).astype(np.float32), np.eye(4))
    nib.save(nii, str(proc_file))

    db = TestingSessionLocal()
    patient = Patient(patient_code="PAT_SEG_02", name="Seg Test Patient 2", age=58, sex="F")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    scan = Scan(
        patient_id=patient.id,
        file_path=str(proc_file),
        original_filename="knee.nii.gz",
        file_type="nii.gz",
        file_size=1000,
        status="preprocessed",
        preprocessing_status="completed",
        preprocessed_path=str(proc_file),
        segmentation_status="not_started",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    scan_id = scan.id
    db.close()

    # Call segmentation endpoint
    response = client.post(f"/scans/{scan_id}/segment")
    assert response.status_code == 200
    data = response.json()
    assert data["scan_id"] == scan_id
    assert data["status"] == "model_unavailable"
    assert data["model_available"] is False
    assert "not available" in data["message"].lower()
    assert data["femur_mask_path"] is None

    # Check status endpoint
    status_res = client.get(f"/scans/{scan_id}/segmentation")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["scan_id"] == scan_id
    assert status_data["status"] == "model_unavailable"
    assert status_data["femur_mask_available"] is False


def test_synthetic_test_model_pipeline_plumbing(tmp_path):
    """7. TEST MODEL ONLY: Test tensor shape plumbing and mask persistence with a synthetic test model."""
    # Create synthetic test model weights (NOT a trained medical model)
    config = SegmentationConfig(
        model_type="monai_unet_3d",
        num_classes=4,
        channels=(8, 16, 32, 64, 128),
        strides=(2, 2, 2, 2),
        num_res_units=1,
        device="cpu",
    )
    test_model = SegmentationModel(config)
    net = test_model._build_network()
    weights_path = tmp_path / "test_plumbing_weights.pth"
    torch.save(net.state_dict(), str(weights_path))

    # Load test weights
    test_model.load_weights(weights_path)
    assert test_model.is_available() is True

    # Create synthetic preprocessed scan
    proc_file = tmp_path / "proc_plumbing_test.nii.gz"
    nii = nib.Nifti1Image(np.random.rand(16, 16, 16).astype(np.float32), np.eye(4))
    nib.save(nii, str(proc_file))

    db = TestingSessionLocal()
    patient = Patient(patient_code="PAT_SEG_03", name="Plumbing Patient", age=45, sex="M")
    db.add(patient)
    db.commit()
    db.refresh(patient)

    scan = Scan(
        patient_id=patient.id,
        file_path=str(proc_file),
        original_filename="plumbing.nii.gz",
        file_type="nii.gz",
        file_size=2048,
        status="preprocessed",
        preprocessing_status="completed",
        preprocessed_path=str(proc_file),
        segmentation_status="not_started",
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)
    scan_id = scan.id

    # Run inference with test model
    res = run_segmentation(db, scan_id, model=test_model)
    assert res["status"] == "completed"
    assert res["model_available"] is True
    assert res["femur_mask_path"] is not None
    assert os.path.exists(res["femur_mask_path"])
    assert os.path.exists(res["tibia_mask_path"])
    assert os.path.exists(res["meniscus_mask_path"])

    db.close()
