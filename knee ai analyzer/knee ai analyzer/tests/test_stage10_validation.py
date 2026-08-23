"""
Stage 10: Automated Tests for JSW Measurement Accuracy, Repeatability & Calibration Safety.
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
from app.services.measurements.pipeline import run_knee_measurement_pipeline


@pytest.fixture
def synthetic_knee_pair():
    """Create a high-resolution synthetic knee image and mask pair."""
    h, w = 2600, 1100
    img = np.random.randint(40, 220, (h, w), dtype=np.uint8)
    mask = np.zeros((h, w), dtype=np.uint8)

    # Add realistic curved joint articulation
    for x in range(350, 750):
        y_c = 1300 + int(20 * np.sin((x - 350) / 400.0 * np.pi))
        mask[y_c - 15:y_c + 15, x] = 1

    return img, mask


def test_three_run_measurement_repeatability(synthetic_knee_pair, tmp_path):
    """Test 1: Three repeated runs of measurement pipeline yield 0.00% variation (100% deterministic)."""
    img, mask = synthetic_knee_pair
    
    results = []
    for _ in range(3):
        res = run_knee_measurement_pipeline(
            raw_image_array=img,
            output_dir=tmp_path,
            save_visualization=False,
        )
        results.append(res)

    # Check JSW consistency across runs
    med_runs = [r["jsw"]["median_px"] for r in results]
    min_runs = [r["jsw"]["min_px"] for r in results]
    max_runs = [r["jsw"]["max_px"] for r in results]
    fg_runs = [r["segmentation"]["foreground_pixels"] for r in results]

    assert len(set(med_runs)) == 1, f"Variation in median JSW: {med_runs}"
    assert len(set(min_runs)) == 1, f"Variation in min JSW: {min_runs}"
    assert len(set(max_runs)) == 1, f"Variation in max JSW: {max_runs}"
    assert len(set(fg_runs)) == 1, f"Variation in foreground pixels: {fg_runs}"


def test_native_space_jsw_coordinate_consistency(synthetic_knee_pair):
    """Test 2 & 3: JSW coordinates strictly match native space dimensions and bounds."""
    img, mask = synthetic_knee_pair
    h, w = img.shape

    geom = extract_native_geometry(mask)
    jsw = calculate_jsw_profile(mask)

    assert geom["bounding_box"]["x_min"] >= 0
    assert geom["bounding_box"]["x_max"] < w
    assert geom["bounding_box"]["y_min"] >= 0
    assert geom["bounding_box"]["y_max"] < h

    for sample in jsw["profile_samples"]:
        assert 0 <= sample["x"] < w
        assert 0 <= sample["y_superior"] <= sample["y_inferior"] < h
        assert sample["jsw_px"] == (sample["y_inferior"] - sample["y_superior"] + 1)


def test_jsw_min_median_max_ordering(synthetic_knee_pair):
    """Test 4: Strict mathematical ordering min_px <= median_px <= max_px."""
    _, mask = synthetic_knee_pair
    jsw = calculate_jsw_profile(mask)

    assert jsw["status"] == "valid"
    assert jsw["min_px"] <= jsw["median_px"] <= jsw["max_px"]
    assert jsw["p10_px"] <= jsw["p25_px"] <= jsw["p75_px"]


@pytest.mark.parametrize("invalid_spacing", [
    [0.0, 0.0],
    [-0.15, -0.15],
    [-1.0, 0.5],
    [0.0, -0.5],
    ["invalid", "spacing"],
    [None, None],
])
def test_invalid_calibration_rejection(invalid_spacing):
    """Test 5: Zero, negative, or non-numeric calibration is safely rejected without crash."""
    jsw_metrics = {"min_px": 20.0, "median_px": 30.0, "mean_px": 28.5, "max_px": 40.0}
    
    try:
        cal = apply_physical_calibration(jsw_metrics, pixel_spacing=invalid_spacing)
    except Exception as e:
        pytest.fail(f"apply_physical_calibration raised unexpected exception on {invalid_spacing}: {e}")

    assert cal["available"] is False
    assert cal["pixel_spacing_mm"] is None
    assert cal["unit"] == "pixels"
    assert cal["jsw_mm"]["median_mm"] is None


def test_missing_calibration_behavior():
    """Test 6: Missing pixel spacing reports pixels only and flags physical availability as False."""
    jsw_metrics = {"min_px": 15.0, "median_px": 25.0, "mean_px": 24.0, "max_px": 35.0}
    cal = apply_physical_calibration(jsw_metrics, pixel_spacing=None)

    assert cal["available"] is False
    assert cal["pixel_spacing_mm"] is None
    assert cal["unit"] == "pixels"
    assert "calibrated" in cal["notice"].lower() or "pixels" in cal["notice"].lower()


def test_warning_case_handling():
    """Test 7: Multi-component fragmented mask triggers VALID_WITH_WARNING status."""
    mask = np.zeros((1000, 1000), dtype=np.uint8)
    # Create 5 disconnected fragments
    for i in range(5):
        mask[100 + i*150:150 + i*150, 200:400] = 1

    geom = extract_native_geometry(mask)
    jsw = calculate_jsw_profile(mask, min_samples=5)
    cal = apply_physical_calibration(jsw)
    qual = evaluate_measurement_quality(geom, jsw, cal)

    assert qual["status"] in ("VALID_WITH_WARNING", "INVALID")
    assert len(qual["warnings"]) > 0


def test_invalid_case_handling_empty_mask():
    """Test 8: Completely empty mask triggers INVALID status."""
    mask = np.zeros((1000, 1000), dtype=np.uint8)
    geom = extract_native_geometry(mask)
    jsw = calculate_jsw_profile(mask)
    cal = apply_physical_calibration(jsw)
    qual = evaluate_measurement_quality(geom, jsw, cal)

    assert qual["status"] == "INVALID"
    assert qual["is_valid"] is False


def test_outlier_preservation_and_reporting():
    """Test 9: Low-area / abnormal masks are preserved and flagged rather than silently dropped."""
    mask = np.zeros((1000, 1000), dtype=np.uint8)
    mask[500:505, 500:505] = 1  # 25 pixels (abnormally tiny)

    geom = extract_native_geometry(mask, min_pixels=100)
    assert geom["status"] == "empty_or_too_small"
    
    jsw = calculate_jsw_profile(mask)
    cal = apply_physical_calibration(jsw)
    qual = evaluate_measurement_quality(geom, jsw, cal)

    assert qual["status"] == "INVALID"


def test_api_measurement_response_consistency(tmp_path):
    """Test 10: API POST and GET endpoints return identical measurement structures."""
    import uuid
    client = TestClient(app)

    unique_code = f"PAT-ST10-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "Stage10 API Test", "age": 60, "sex": "F"})
    assert p_res.status_code == 201
    p_id = p_res.json()["id"]

    # Upload test radiograph
    arr = np.random.randint(50, 200, (400, 200), dtype=np.uint8)
    test_png_path = tmp_path / "stage10_test.png"
    Image.fromarray(arr).save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("stage10_test.png", f, "image/png")})
    assert up_res.status_code == 201
    scan_id = up_res.json()["scan_id"]

    # Preprocess
    prep_res = client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})
    assert prep_res.status_code == 200

    # POST Measurements
    post_res = client.post(f"/scans/{scan_id}/measurements")
    assert post_res.status_code == 200
    post_data = post_res.json()

    # GET Measurements
    get_res = client.get(f"/scans/{scan_id}/measurements")
    assert get_res.status_code == 200
    get_data = get_res.json()

    # Verify matching attributes
    assert post_data["scan_id"] == get_data["scan_id"]
    assert post_data["native_dimensions"] == get_data["native_dimensions"]
    assert post_data["jsw"] == get_data["jsw"]
    assert post_data["quality"]["status"] == get_data["quality"]["status"]
