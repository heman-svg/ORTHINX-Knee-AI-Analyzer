import pytest
import numpy as np
import torch
from PIL import Image
from pathlib import Path

from app.services.training.monai_dataset import (
    LetterboxResizeAndPadd,
    convert_mask_binary,
    convert_image_to_single_channel,
    get_2d_training_transforms,
    get_2d_validation_transforms,
)
from app.services.training.dataset import load_split_csv


def test_letterbox_aspect_ratio_preservation_and_shape():
    """Verify that LetterboxResizeAndPadd preserves aspect ratio and outputs exactly (1, 512, 512)."""
    # Create non-square test image (e.g. 1088 x 2680 typical of radiograph)
    native_w, native_h = 1088, 2680
    raw_img = np.random.randint(0, 255, (1, native_h, native_w), dtype=np.uint8)
    raw_mask = (np.random.rand(1, native_h, native_w) > 0.8).astype(np.int64)

    data = {
        "image": raw_img,
        "mask": raw_mask,
    }

    transform = LetterboxResizeAndPadd(keys=["image", "mask"], spatial_size=(512, 512))
    out = transform(data)

    # 1. Check output shape
    assert out["image"].shape == (1, 512, 512)
    assert out["mask"].shape == (1, 512, 512)

    # 2. Check padding behavior: native aspect ratio is 1088 / 2680 = 0.406
    # Scaled width should be round(1088 * (512 / 2680)) = 208 px
    # Expected pad left/right = (512 - 208) // 2 = 152 px
    pad_left = (512 - int(round(1088 * (512.0 / 2680.0)))) // 2
    # Area outside padded region should be strictly 0
    assert np.all(out["image"][:, :, :pad_left] == 0)
    assert np.all(out["image"][:, :, 512 - pad_left :] == 0)


def test_letterbox_binary_mask_preservation():
    """Verify that discrete binary labels [0, 1] are strictly preserved without intermediate floats."""
    native_w, native_h = 800, 1600
    raw_img = np.random.randint(0, 255, (1, native_h, native_w), dtype=np.uint8)
    # Mask with foreground component
    raw_mask = np.zeros((1, native_h, native_w), dtype=np.int64)
    raw_mask[0, 500:1000, 200:600] = 1

    data = {
        "image": raw_img,
        "mask": raw_mask,
    }

    transform = LetterboxResizeAndPadd(keys=["image", "mask"], spatial_size=(512, 512))
    out = transform(data)

    unique_mask_vals = np.unique(out["mask"])
    assert set(unique_mask_vals).issubset({0, 1})
    assert np.sum(out["mask"] == 1) > 0


def test_spatial_alignment_between_image_and_mask():
    """Verify that image feature coordinates match mask feature coordinates after letterboxing."""
    native_w, native_h = 1000, 2000
    raw_img = np.zeros((1, native_h, native_w), dtype=np.uint8)
    raw_mask = np.zeros((1, native_h, native_w), dtype=np.int64)

    # Draw a distinct rectangle in the center of both image and mask
    raw_img[0, 800:1200, 400:600] = 200
    raw_mask[0, 800:1200, 400:600] = 1

    data = {
        "image": raw_img,
        "mask": raw_mask,
    }

    transform = LetterboxResizeAndPadd(keys=["image", "mask"], spatial_size=(512, 512))
    out = transform(data)

    img_active = out["image"][0] > 0
    mask_active = out["mask"][0] == 1

    # Overlap should be perfectly aligned
    overlap = np.logical_and(img_active, mask_active)
    assert np.sum(overlap) > 0
    assert np.all(img_active[mask_active])


def test_split_leakage_absence():
    """Verify 0 overlap across Train (280), Val (60), Test (60) splits."""
    train_rows = load_split_csv(Path("data/splits/train.csv"))
    val_rows = load_split_csv(Path("data/splits/val.csv"))
    test_rows = load_split_csv(Path("data/splits/test.csv"))

    train_pids = set(r["patient_id"] for r in train_rows)
    val_pids = set(r["patient_id"] for r in val_rows)
    test_pids = set(r["patient_id"] for r in test_rows)

    assert len(train_pids.intersection(val_pids)) == 0
    assert len(train_pids.intersection(test_pids)) == 0
    assert len(val_pids.intersection(test_pids)) == 0
    assert len(train_pids) == 280
    assert len(val_pids) == 60
    assert len(test_pids) == 60


def test_unletterbox_mask_and_coordinate_restoration():
    """Verify that unletterbox_mask_array correctly restores mask to exact native original dimensions."""
    from app.services.training.monai_dataset import (
        letterbox_image_array,
        unletterbox_mask_array,
        unletterbox_coordinates,
    )

    native_h, native_w = 2680, 1088
    native_mask = np.zeros((native_h, native_w), dtype=np.uint8)
    # Define a central box in native coordinates
    ymin, ymax = 1200, 1500
    xmin, xmax = 400, 700
    native_mask[ymin:ymax, xmin:xmax] = 1

    # 1. Forward letterbox
    padded_mask, meta = letterbox_image_array(native_mask, spatial_size=(512, 512), is_mask=True)
    assert padded_mask.shape == (512, 512)
    assert set(np.unique(padded_mask)).issubset({0, 1})

    # 2. Inverse unletterbox
    restored_mask = unletterbox_mask_array(padded_mask, meta)
    assert restored_mask.shape == (native_h, native_w)
    assert set(np.unique(restored_mask)).issubset({0, 1})

    # 3. Check restored overlap with original box
    intersection = np.logical_and(native_mask == 1, restored_mask == 1).sum()
    dice_restored = (2.0 * intersection) / ((native_mask == 1).sum() + (restored_mask == 1).sum())
    assert dice_restored > 0.98, f"Restored mask Dice {dice_restored:.4f} should be near 1.0"

    # 4. Coordinate point restoration
    pad_x, pad_y = meta["pad_x"], meta["pad_y"]
    scale = meta["scale"]
    # Point at center of box in padded coordinates
    x_pad = pad_x + (550 * scale)
    y_pad = pad_y + (1350 * scale)
    x_orig, y_orig = unletterbox_coordinates(x_pad, y_pad, meta)
    assert abs(x_orig - 550) < 2.0
    assert abs(y_orig - 1350) < 2.0


def test_no_anisotropic_stretching_isotropic_scaling():
    """Verify that horizontal and vertical scale factors are strictly identical (isotropic)."""
    from app.services.training.monai_dataset import letterbox_image_array

    native_h, native_w = 2680, 1088
    dummy_img = np.zeros((native_h, native_w), dtype=np.uint8)
    _, meta = letterbox_image_array(dummy_img, spatial_size=(512, 512), is_mask=False)

    scale_x = meta["nw"] / native_w
    scale_y = meta["nh"] / native_h
    # Scale ratio should be 1.0 (zero anisotropic stretching)
    assert abs(scale_x - scale_y) < 0.01
    assert meta["scale"] == min(512.0 / native_w, 512.0 / native_h)


def test_letterbox_metadata_preservation():
    """Verify LetterboxResizeAndPadd adds letterbox_meta to the sample dict."""
    raw_img = np.zeros((1, 1000, 500), dtype=np.uint8)
    raw_mask = np.zeros((1, 1000, 500), dtype=np.int64)

    data = {"image": raw_img, "mask": raw_mask}
    tf = LetterboxResizeAndPadd(keys=["image", "mask"], spatial_size=(512, 512))
    out = tf(data)

    assert "letterbox_meta" in out
    meta = out["letterbox_meta"]
    assert meta["orig_h"] == 1000
    assert meta["orig_w"] == 500
    assert meta["spatial_size"] == (512, 512)
    assert meta["scale"] == 512.0 / 1000.0

