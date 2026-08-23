from pathlib import Path
import numpy as np
import pytest
from PIL import Image

from app.services.training.cgmh_adapter import CGMHKneeSegAdapter


@pytest.fixture
def synthetic_cgmh_dataset(tmp_path) -> Path:
    """Create a synthetic CGMH KneeSeg directory structure with PNG slice pairs."""
    img_dir = tmp_path / "images"
    mask_dir = tmp_path / "labels"
    img_dir.mkdir()
    mask_dir.mkdir()

    for i in range(1, 6):
        # 2D Grayscale PNG Image
        arr = (np.random.rand(64, 64) * 255).astype(np.uint8)
        img = Image.fromarray(arr)
        img.save(str(img_dir / f"CGMH_Case_{i:03d}_image.png"))

        # Multi-class discrete mask
        mask_arr = np.random.choice([0, 1, 2, 3], size=(64, 64)).astype(np.uint8)
        mask = Image.fromarray(mask_arr)
        mask.save(str(mask_dir / f"CGMH_Case_{i:03d}_mask.png"))

    # Add 1 unmatched image
    unmatched_img = Image.fromarray((np.random.rand(64, 64) * 255).astype(np.uint8))
    unmatched_img.save(str(img_dir / "CGMH_Case_999_image.png"))

    return tmp_path


def test_cgmh_subject_id_extraction():
    """1. Test subject identifier extraction from CGMH naming conventions."""
    assert CGMHKneeSegAdapter.extract_subject_id("CGMH_001_slice_05.png") == "cgmh_001"
    assert CGMHKneeSegAdapter.extract_subject_id("Knee_Patient_12_mask.png") == "knee_patient_12"
    assert CGMHKneeSegAdapter.extract_subject_id("Case104_image.nii.gz") == "case104"


def test_cgmh_discover_pairs(synthetic_cgmh_dataset):
    """2. Test discovering and pairing images and masks."""
    pairs = CGMHKneeSegAdapter.discover_pairs(synthetic_cgmh_dataset)
    assert len(pairs) == 5
    for p in pairs:
        assert Path(p["image"]).exists()
        assert Path(p["mask"]).exists()
        assert "cgmh_case" in p["subject_id"]


def test_cgmh_inspect_dataset_deep(synthetic_cgmh_dataset):
    """3. Test deep dataset inspection on synthetic CGMH dataset."""
    report = CGMHKneeSegAdapter.inspect_dataset_deep(synthetic_cgmh_dataset)
    assert report["available"] is True
    assert report["total_images"] == 6
    assert report["total_masks"] == 5
    assert report["valid_pairs"] == 5
    assert report["unmatched_images"] == 1
    assert report["unmatched_masks"] == 0
    assert report["subject_count"] == 5
    assert 0 in report["unique_labels"]


def test_cgmh_inspect_dataset_missing_dir():
    """4. Test inspection handling when dataset path does not exist."""
    report = CGMHKneeSegAdapter.inspect_dataset_deep("non_existent_dataset_path")
    assert report["available"] is False
    assert report["valid_pairs"] == 0
