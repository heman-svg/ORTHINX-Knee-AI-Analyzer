"""
Unit and Integration Tests for Stage 9 Native-Space Knee Joint Measurements and JSW Profiling.
"""

from pathlib import Path
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.measurements.geometry import extract_native_geometry
from app.services.measurements.jsw import calculate_jsw_profile
from app.services.measurements.calibration import apply_physical_calibration
from app.services.measurements.quality import evaluate_measurement_quality
from app.services.measurements.visualization import generate_measurement_visualization
from app.services.measurements.pipeline import (
    run_knee_measurement_pipeline,
    extract_measurements_for_scan,
)
from app.services.training.monai_dataset import (
    letterbox_image_array,
    unletterbox_mask_array,
    unletterbox_coordinates,
)


@pytest.fixture
def synthetic_native_knee_mask():
    """Create a realistic synthetic native knee joint mask in 1080x2500 resolution."""
    h, w = 2500, 1080
    mask = np.zeros((h, w), dtype=np.uint8)
    # Articulation zone around y=1200..1300, x=350..750
    # Simulate a curved joint clearance space
    for x in range(350, 750):
        # clearance height ~25-35 px
        y_center = 1250 + int(15 * np.sin((x - 350) / 400.0 * np.pi))
        y1 = y_center - 15
        y2 = y_center + 15
        mask[y1:y2, x] = 1
    return mask


@pytest.fixture
def synthetic_native_xray():
    """Create a synthetic native radiograph."""
    h, w = 2500, 1080
    xray = np.full((h, w), 120, dtype=np.uint8)
    # Add some structure
    xray[1000:1500, 300:800] = 180
    return xray


def test_native_mask_reconstruction_and_dimensions(synthetic_native_knee_mask):
    """Test 1 & 2: Forward letterboxing and inverse native restoration preserves exact dimensions."""
    orig_h, orig_w = synthetic_native_knee_mask.shape
    letterboxed, meta = letterbox_image_array(synthetic_native_knee_mask, spatial_size=(512, 512), is_mask=True)

    assert letterboxed.shape == (512, 512)
    assert set(np.unique(letterboxed)).issubset({0, 1})

    restored_native = unletterbox_mask_array(letterboxed, meta)
    assert restored_native.shape == (orig_h, orig_w)
    assert set(np.unique(restored_native)).issubset({0, 1})


def test_geometry_extraction_and_connected_components(synthetic_native_knee_mask):
    """Test 3, 4, 5, 6, 7: Binary validation, components, bounding box, centroid, and area."""
    geom = extract_native_geometry(synthetic_native_knee_mask, min_pixels=50)

    assert geom["status"] == "valid"
    assert geom["foreground_pixels"] > 0
    assert 0.0 < geom["area_percentage"] < 5.0
    assert geom["component_count"] == 1
    assert geom["largest_component_percentage"] == 100.0

    bbox = geom["bounding_box"]
    assert bbox["x_min"] == 350
    assert bbox["x_max"] == 749
    assert bbox["width"] == 400
    assert bbox["height"] > 20

    centroid = geom["centroid"]
    assert 350 <= centroid["x"] <= 750
    assert 1200 <= centroid["y"] <= 1300


def test_jsw_profiling_calculation(synthetic_native_knee_mask):
    """Test 8: JSW profiling calculates valid pixel distance statistics across columns."""
    jsw = calculate_jsw_profile(synthetic_native_knee_mask, min_samples=10, margin_trim_ratio=0.05)

    assert jsw["status"] == "valid"
    assert jsw["min_px"] > 0.0
    assert jsw["max_px"] >= jsw["min_px"]
    assert jsw["median_px"] is not None
    assert jsw["mean_px"] is not None
    assert jsw["sample_count"] > 100
    assert len(jsw["profile_samples"]) == jsw["sample_count"]
    assert "compartment_asymmetry_ratio" in jsw


def test_pixel_to_mm_calibration_with_valid_spacing():
    """Test 9: Physical calibration applies correct mm scaling when spacing is present."""
    jsw_in = {
        "min_px": 20.0,
        "median_px": 30.0,
        "mean_px": 28.5,
        "max_px": 40.0,
        "std_px": 5.0,
        "p10_px": 22.0,
        "p25_px": 25.0,
        "p75_px": 35.0,
    }
    cal = apply_physical_calibration(jsw_in, pixel_spacing=[0.15, 0.15])

    assert cal["available"] is True
    assert cal["pixel_spacing_mm"] == 0.15
    assert cal["unit"] == "millimeters"
    assert cal["jsw_mm"]["median_mm"] == round(30.0 * 0.15, 3)
    assert cal["jsw_mm"]["min_mm"] == round(20.0 * 0.15, 3)


def test_missing_calibration_handling():
    """Test 10: Missing pixel spacing returns uncalibrated status without fabricating mm values."""
    jsw_in = {"min_px": 20.0, "median_px": 30.0, "mean_px": 28.5, "max_px": 40.0}
    cal = apply_physical_calibration(jsw_in, pixel_spacing=None)

    assert cal["available"] is False
    assert cal["pixel_spacing_mm"] is None
    assert cal["unit"] == "pixels"
    assert cal["jsw_mm"]["median_mm"] is None
    assert "uncalibrated" in cal["notice"].lower() or "requires calibrated" in cal["notice"].lower()


def test_quality_control_evaluates_empty_and_fragmented_masks():
    """Test 11: Invalid or empty segmentations receive INVALID / WARNING status."""
    # Empty mask test
    empty_mask = np.zeros((500, 500), dtype=np.uint8)
    geom_empty = extract_native_geometry(empty_mask, min_pixels=50)
    jsw_empty = calculate_jsw_profile(empty_mask)
    cal_empty = apply_physical_calibration(jsw_empty)
    qual_empty = evaluate_measurement_quality(geom_empty, jsw_empty, cal_empty)

    assert qual_empty["status"] == "INVALID"
    assert qual_empty["is_valid"] is False

    # Fragmented multi-component mask
    frag_mask = np.zeros((1000, 1000), dtype=np.uint8)
    frag_mask[100:150, 100:150] = 1
    frag_mask[400:450, 400:450] = 1
    frag_mask[700:750, 700:750] = 1
    frag_mask[800:850, 800:850] = 1
    geom_frag = extract_native_geometry(frag_mask, min_pixels=10)
    jsw_frag = calculate_jsw_profile(frag_mask, min_samples=5)
    cal_frag = apply_physical_calibration(jsw_frag)
    qual_frag = evaluate_measurement_quality(geom_frag, jsw_frag, cal_frag)

    assert qual_frag["status"] in ("VALID_WITH_WARNING", "INVALID")
    assert len(qual_frag["warnings"]) > 0


def test_measurement_visualization_generation(synthetic_native_xray, synthetic_native_knee_mask, tmp_path):
    """Test 13: Measurement visualization renders successfully and exports a PNG."""
    geom = extract_native_geometry(synthetic_native_knee_mask)
    jsw = calculate_jsw_profile(synthetic_native_knee_mask)
    cal = apply_physical_calibration(jsw)
    qual = evaluate_measurement_quality(geom, jsw, cal)

    out_file = tmp_path / "test_meas_vis.png"
    img = generate_measurement_visualization(
        raw_native_img=synthetic_native_xray,
        native_mask=synthetic_native_knee_mask,
        geometry_metrics=geom,
        jsw_metrics=jsw,
        calibration_metrics=cal,
        quality_metrics=qual,
        output_path=out_file,
    )

    assert isinstance(img, Image.Image)
    assert out_file.exists()
    assert out_file.stat().st_size > 1000


def test_end_to_end_measurement_pipeline(synthetic_native_xray, synthetic_native_knee_mask, tmp_path):
    """Test 14: Full end-to-end pipeline execution with precomputed 512x512 mask."""
    # Create 512x512 letterbox mask
    mask_512, _ = letterbox_image_array(synthetic_native_knee_mask, spatial_size=(512, 512), is_mask=True)

    result = run_knee_measurement_pipeline(
        raw_image_array=synthetic_native_xray,
        pred_mask_512=mask_512,
        output_dir=tmp_path,
        save_visualization=True,
    )

    assert result["status"] == "completed"
    assert result["native_dimensions"]["width"] == synthetic_native_xray.shape[1]
    assert result["native_dimensions"]["height"] == synthetic_native_xray.shape[0]
    assert result["segmentation"]["foreground_pixels"] > 0
    assert result["jsw"]["median_px"] is not None
    assert result["quality"]["is_valid"] is True
    assert result["visualization_path"] is not None
    assert Path(result["visualization_path"]).exists()


def test_api_measurement_endpoint(tmp_path):
    """Test 12: API endpoint POST /scans/{scan_id}/measurements."""
    import uuid
    client = TestClient(app)

    # Create patient with unique code
    unique_code = f"PAT-ST9-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "Stage9 Test", "age": 55, "sex": "M"})
    assert p_res.status_code == 201
    p_id = p_res.json()["id"]

    # Upload non-uniform PNG with variance
    arr = np.random.randint(50, 200, (400, 200), dtype=np.uint8)
    png_img = Image.fromarray(arr)
    test_png_path = tmp_path / "knee_test.png"
    png_img.save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("knee_test.png", f, "image/png")})
    assert up_res.status_code == 201
    scan_id = up_res.json()["scan_id"]

    # Preprocess
    prep_res = client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})
    assert prep_res.status_code == 200

    # Execute Measurements Endpoint
    meas_res = client.post(f"/scans/{scan_id}/measurements")
    assert meas_res.status_code == 200
    data = meas_res.json()

    assert data["scan_id"] == scan_id
    assert "native_dimensions" in data
    assert "segmentation" in data
    assert "jsw" in data
    assert "calibration" in data
    assert "quality" in data
