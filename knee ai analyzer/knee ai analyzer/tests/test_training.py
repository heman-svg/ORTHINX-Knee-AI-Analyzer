import os
from pathlib import Path
import numpy as np
import pytest
import torch
import nibabel as nib

from app.services.training.config import TrainingConfig
from app.services.training.dataset import (
    extract_patient_id,
    find_and_pair_samples,
    validate_image_mask_pair,
    create_patient_splits,
    save_split_csv,
    load_split_csv,
)
from app.services.training.monai_dataset import (
    get_training_transforms,
    get_validation_transforms,
    create_monai_dataloaders,
)
from app.services.training.trainer import SegmentationTrainer
from app.services.training.visualization import create_segmentation_overlay, save_triplet_visualization
from scripts.inspect_dataset import inspect_dataset


@pytest.fixture
def synthetic_dataset(tmp_path) -> Path:
    """Create a minimal synthetic dataset of 4 paired NIfTI cases."""
    img_dir = tmp_path / "images"
    mask_dir = tmp_path / "labels"
    img_dir.mkdir()
    mask_dir.mkdir()

    for i in range(1, 5):
        # Image
        img_arr = np.random.uniform(10.0, 500.0, (16, 16, 16)).astype(np.float32)
        nii_img = nib.Nifti1Image(img_arr, np.eye(4))
        nib.save(nii_img, str(img_dir / f"patient_{i:03d}_image.nii.gz"))

        # Mask
        mask_arr = np.random.choice([0, 1, 2, 3], size=(16, 16, 16)).astype(np.uint8)
        nii_mask = nib.Nifti1Image(mask_arr, np.eye(4))
        nib.save(nii_mask, str(mask_dir / f"patient_{i:03d}_mask.nii.gz"))

    return tmp_path


def test_patient_id_extraction():
    """1. Test patient ID parsing from different filename conventions."""
    assert extract_patient_id("patient_001_0000.nii.gz") == "patient_001"
    assert extract_patient_id("case42_image.nii.gz") == "case42"
    assert extract_patient_id("sub_05_seg.nii.gz") == "sub_05"


def test_find_and_pair_samples(synthetic_dataset):
    """2. Test finding and correctly pairing images with masks."""
    pairs = find_and_pair_samples(synthetic_dataset)
    assert len(pairs) == 4
    for p in pairs:
        assert Path(p["image"]).exists()
        assert Path(p["mask"]).exists()
        assert p["patient_id"].startswith("patient_")


def test_validate_image_mask_pair(synthetic_dataset):
    """3. Test pair validation and mismatch detection."""
    pairs = find_and_pair_samples(synthetic_dataset)
    # Valid pair
    is_val, err = validate_image_mask_pair(pairs[0]["image"], pairs[0]["mask"])
    assert is_val is True

    # Missing file
    is_val2, err2 = validate_image_mask_pair("missing.nii.gz", pairs[0]["mask"])
    assert is_val2 is False
    assert "does not exist" in err2


def test_deterministic_patient_level_split(synthetic_dataset, tmp_path):
    """4. Test that dataset is split strictly by patient ID without leakage."""
    pairs = find_and_pair_samples(synthetic_dataset)
    splits_dir = tmp_path / "splits"

    train, val, test = create_patient_splits(
        pairs, splits_dir=splits_dir, train_ratio=0.5, val_ratio=0.25, test_ratio=0.25, seed=42
    )

    # Check non-empty sets
    assert len(train) > 0
    assert len(val) > 0
    assert len(test) > 0

    # Ensure mutually exclusive patient IDs across splits
    train_pids = {x["patient_id"] for x in train}
    val_pids = {x["patient_id"] for x in val}
    test_pids = {x["patient_id"] for x in test}

    assert train_pids.isdisjoint(val_pids)
    assert train_pids.isdisjoint(test_pids)
    assert val_pids.isdisjoint(test_pids)

    # Verify CSV files created
    assert (splits_dir / "train.csv").exists()
    assert (splits_dir / "val.csv").exists()
    assert (splits_dir / "test.csv").exists()


def test_inspect_dataset_script(synthetic_dataset):
    """5. Test dataset inspection utility."""
    report = inspect_dataset(synthetic_dataset)
    assert report["status"] == "inspected"
    assert report["images_count"] == 4
    assert report["masks_count"] == 4
    assert report["image_shapes"] == [[16, 16, 16]]
    assert len(report["unique_labels"]) > 0


def test_trainer_checkpoint_saving_and_loading(tmp_path):
    """6. Test trainer checkpoint serialization and resumption."""
    config = TrainingConfig(
        checkpoint_dir=tmp_path / "weights",
        channels=(8, 16, 32, 64, 128),
        strides=(2, 2, 2, 2),
        num_res_units=1,
        device="cpu",
    )
    trainer = SegmentationTrainer(config=config)
    ckpt_path = config.checkpoint_dir / "test_ckpt.pth"

    trainer.save_checkpoint(ckpt_path, is_best=True)
    assert ckpt_path.exists()
    assert (config.checkpoint_dir / "best_model.pth").exists()

    # Load checkpoint
    new_trainer = SegmentationTrainer(config=config)
    success = new_trainer.load_checkpoint(ckpt_path)
    assert success is True


def test_visualization_generation(tmp_path):
    """7. Test segmentation visualization generation."""
    image_slice = np.random.rand(32, 32).astype(np.float32)
    mask_slice = np.random.choice([0, 1, 2, 3], size=(32, 32)).astype(np.uint8)
    out_file = tmp_path / "test_overlay.png"

    save_triplet_visualization(image_slice, mask_slice, mask_slice, out_file)
    assert out_file.exists()
