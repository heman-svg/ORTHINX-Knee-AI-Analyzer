"""
Comprehensive unit and smoke test suite for the Single-Image KneeAI Analyzer pipeline.
Tests image validation, grayscale normalization, adaptive enhancement, letterboxing,
native mask restoration, calibration safety, quality control, and API response schemas.
"""

import io
from pathlib import Path
import numpy as np
import pytest
from PIL import Image

from app.services.single_image.pipeline import (
    validate_uploaded_image,
    normalize_image_to_grayscale,
    enhance_xray_image,
    preprocess_for_v2,
    run_v2_inference,
    restore_native_mask,
    calculate_native_jsw,
    run_quality_control,
    analyze_single_knee_image,
    DEFAULT_ENHANCEMENT_CONFIG,
    get_v2_model,
)


@pytest.fixture
def sample_synthetic_knee_png() -> bytes:
    """Create a synthetic high-contrast knee radiograph PNG buffer."""
    h, w = 600, 450  # Non-square portrait
    arr = np.zeros((h, w), dtype=np.uint8)
    # Background soft gradient
    for y in range(h):
        arr[y, :] = int(30 + (y / h) * 70)

    # Femur distal bone region
    arr[50:260, 100:350] = 200
    # Tibia proximal bone region
    arr[310:550, 90:360] = 190
    # Joint space with articulation gap (260:310)

    pil_img = Image.fromarray(arr)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()


@pytest.fixture
def sample_synthetic_rgb_jpeg() -> bytes:
    """Create a synthetic RGB JPEG buffer with non-square aspect ratio."""
    h, w = 400, 800  # Wide landscape
    rgb = np.zeros((h, w, 3), dtype=np.uint8)
    rgb[:, :, 0] = 120  # Red tint
    rgb[:, :, 1] = 140
    rgb[:, :, 2] = 160
    # Anatomical region
    rgb[100:300, 200:600, :] = 220

    pil_img = Image.fromarray(rgb)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    return buf.getvalue()


# -------------------------------------------------------------------------
# Test 1: Validation
# -------------------------------------------------------------------------
def test_image_validation_valid_png(sample_synthetic_knee_png):
    meta = validate_uploaded_image(sample_synthetic_knee_png, "patient_knee.png")
    assert meta["format"] == "PNG"
    assert meta["width"] == 450
    assert meta["height"] == 600
    assert meta["channels"] == 1


def test_image_validation_valid_jpeg(sample_synthetic_rgb_jpeg):
    meta = validate_uploaded_image(sample_synthetic_rgb_jpeg, "scan.jpeg")
    assert meta["format"] == "JPEG"
    assert meta["width"] == 800
    assert meta["height"] == 400
    assert meta["channels"] == 3


def test_image_validation_corrupt_bytes():
    with pytest.raises(ValueError, match="corrupted|unreadable"):
        validate_uploaded_image(b"not a valid image header or file", "corrupt.png")


def test_image_validation_empty_bytes():
    with pytest.raises(ValueError, match="empty"):
        validate_uploaded_image(b"", "empty.png")


# -------------------------------------------------------------------------
# Test 2: Grayscale Normalization
# -------------------------------------------------------------------------
def test_grayscale_normalization_rgb():
    rgb_arr = np.ones((100, 100, 3), dtype=np.uint8) * 150
    gray = normalize_image_to_grayscale(rgb_arr)
    assert gray.ndim == 2
    assert gray.shape == (100, 100)
    assert np.all(gray >= 0.0)


# -------------------------------------------------------------------------
# Test 3: Enhancement Pipeline
# -------------------------------------------------------------------------
def test_enhancement_configurable():
    raw_2d = np.linspace(20, 220, 10000, dtype=np.float32).reshape((100, 100))
    
    # 1. Enabled with CLAHE & Denoise
    cfg_on = {"enabled": True, "clahe": True, "denoise": True}
    enh_on, meta_on = enhance_xray_image(raw_2d, cfg_on)
    assert enh_on.shape == (100, 100)
    assert enh_on.dtype == np.uint8
    assert meta_on["clahe_applied"] is True

    # 2. Disabled enhancement passes through normalized image
    cfg_off = {"enabled": False}
    enh_off, meta_off = enhance_xray_image(raw_2d, cfg_off)
    assert enh_off.shape == (100, 100)
    assert meta_off["enabled"] is False


# -------------------------------------------------------------------------
# Test 4: Aspect-Ratio Preserving Letterboxing & Inverse Unletterbox
# -------------------------------------------------------------------------
def test_letterbox_and_native_restoration_portrait():
    orig_h, orig_w = 900, 300  # 3:1 aspect ratio
    raw_img = np.random.randint(50, 200, size=(orig_h, orig_w), dtype=np.uint8)

    tensor_512, meta = preprocess_for_v2(raw_img, spatial_size=(512, 512))
    assert tensor_512.shape == (1, 1, 512, 512)
    assert meta["orig_h"] == 900
    assert meta["orig_w"] == 300
    assert meta["scale"] == 512 / 900  # Scaled by height constraint

    # Simulate 512x512 predicted mask inside active region
    mask_512 = np.zeros((512, 512), dtype=np.uint8)
    pad_y, pad_x = meta["pad_y"], meta["pad_x"]
    nh, nw = meta["nh"], meta["nw"]
    mask_512[pad_y + 10 : pad_y + nh - 10, pad_x + 5 : pad_x + nw - 5] = 1

    # Restore to native
    native_mask = restore_native_mask(mask_512, meta)
    assert native_mask.shape == (orig_h, orig_w)
    assert set(np.unique(native_mask)).issubset({0, 1})


def test_letterbox_and_native_restoration_landscape():
    orig_h, orig_w = 400, 1200  # 1:3 wide landscape
    raw_img = np.random.randint(50, 200, size=(orig_h, orig_w), dtype=np.uint8)

    tensor_512, meta = preprocess_for_v2(raw_img, spatial_size=(512, 512))
    assert tensor_512.shape == (1, 1, 512, 512)
    assert meta["scale"] == 512 / 1200  # Scaled by width constraint

    mask_512 = np.zeros((512, 512), dtype=np.uint8)
    native_mask = restore_native_mask(mask_512, meta)
    assert native_mask.shape == (orig_h, orig_w)


# -------------------------------------------------------------------------
# Test 5: Calibration Safety
# -------------------------------------------------------------------------
def test_calibration_safety_uncalibrated():
    mask = np.zeros((500, 500), dtype=np.uint8)
    mask[200:250, 150:350] = 1  # 50px high by 200px wide joint

    geom, jsw, calib = calculate_native_jsw(mask, pixel_spacing=None)
    assert calib["available"] is False
    assert calib["unit"] == "pixels"
    assert jsw["min_px"] is not None
    assert jsw["min_mm"] is None
    assert geom["area_mm2"] is None


def test_calibration_safety_explicit_spacing():
    mask = np.zeros((500, 500), dtype=np.uint8)
    mask[200:250, 150:350] = 1

    geom, jsw, calib = calculate_native_jsw(mask, pixel_spacing=0.15)
    assert calib["available"] is True
    assert calib["unit"] == "mm"
    assert jsw["min_px"] is not None
    assert jsw["min_mm"] == pytest.approx(float(jsw["min_px"]) * 0.15, rel=1e-2)
    assert geom["area_mm2"] is not None


# -------------------------------------------------------------------------
# Test 6: Quality Control
# -------------------------------------------------------------------------
def test_quality_control_empty_mask():
    empty_mask = np.zeros((500, 500), dtype=np.uint8)
    geom, jsw, calib = calculate_native_jsw(empty_mask, pixel_spacing=None)
    qc = run_quality_control(geom, jsw, calib)
    assert qc["status"] == "INVALID"
    assert qc["quality_score"] == 0.0


# -------------------------------------------------------------------------
# Test 7: End-to-End Single Image Analysis Smoke Test
# -------------------------------------------------------------------------
def test_end_to_end_single_image_analysis(sample_synthetic_knee_png, tmp_path):
    response = analyze_single_knee_image(
        file_bytes=sample_synthetic_knee_png,
        filename="smoke_test_knee.png",
        enhancement_config={"enabled": True, "clahe": True, "denoise": True},
        pixel_spacing=0.14,
        save_artifacts=True,
        output_dir=tmp_path,
    )

    assert response["status"] == "success"
    assert response["original_image"]["width"] == 450
    assert response["original_image"]["height"] == 600
    assert response["preprocessing"]["enhancement_applied"] is True
    assert "letterbox_scale" in response["preprocessing"]
    assert "quality" in response["segmentation"]
    assert "jsw_median_px" in response["measurements"]
    assert response["calibration"]["unit"] == "mm"
    assert "inference_time_ms" in response["processing"]
