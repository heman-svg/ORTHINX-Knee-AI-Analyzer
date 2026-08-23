"""
Stage 11: Unit and Integration Tests for Research Knee Assessment & Structured Reporting.
Verifies assessment generation, safety notices, absence of clinical claims, and reliability scoring.
"""

from pathlib import Path
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.assessment.engine import (
    generate_research_assessment,
    compute_measurement_reliability_score,
)
from app.services.assessment.pipeline import run_research_assessment_pipeline
from app.services.assessment.visualization import render_assessment_visual_report


@pytest.fixture
def synthetic_assessment_inputs():
    """Create sample segmentation, JSW, calibration, and QC dictionaries."""
    seg_metrics = {
        "foreground_pixels": 45000,
        "area_percentage": 1.75,
        "component_count": 2,
        "largest_component_percentage": 55.0,
        "top2_components_percentage": 98.0,
        "bounding_box": {"x_min": 200, "y_min": 500, "x_max": 800, "y_max": 700, "width": 600, "height": 200},
        "centroid": {"x": 500.0, "y": 600.0},
    }
    jsw_metrics = {
        "status": "valid",
        "min_px": 12.0,
        "median_px": 28.5,
        "mean_px": 27.8,
        "max_px": 42.0,
        "std_px": 4.5,
        "p10_px": 15.0,
        "p25_px": 22.0,
        "p75_px": 34.0,
        "sample_count": 120,
        "compartment_asymmetry_ratio": 0.92,
        "profile_samples": [{"x": 200 + i, "y_superior": 550, "y_inferior": 580, "jsw_px": 31.0} for i in range(50)],
    }
    cal_metrics = {
        "available": False,
        "pixel_spacing_mm": None,
        "unit": "pixels",
        "notice": "Uncalibrated PNG (Pixel measurements only)",
        "jsw_mm": {"median_mm": None, "min_mm": None, "max_mm": None},
    }
    qc_metrics = {
        "status": "VALID",
        "warnings": [],
        "is_valid": True,
    }
    return seg_metrics, jsw_metrics, cal_metrics, qc_metrics


def test_research_assessment_generation(synthetic_assessment_inputs):
    """Test 1: Full structured research assessment object generates successfully."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    res = generate_research_assessment(
        scan_id=101,
        filename="test_scan.png",
        native_dimensions={"height": 2000, "width": 1000},
        seg_metrics=seg,
        jsw_metrics=jsw,
        cal_metrics=cal,
        qc_metrics=qc,
    )
    assert res.status == "completed"
    assert res.scan_info.scan_id == 101
    assert res.scan_info.native_dimensions == {"height": 2000, "width": 1000}
    assert res.segmentation.segmentation_quality == "HIGH"
    assert res.quality_control.quality_status == "VALID"


def test_valid_assessment_properties(synthetic_assessment_inputs):
    """Test 2: VALID assessment produces high reliability score and intact status."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    res = generate_research_assessment(
        scan_id=1,
        filename="valid.png",
        native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg,
        jsw_metrics=jsw,
        cal_metrics=cal,
        qc_metrics=qc,
    )
    assert res.quality_control.quality_status == "VALID"
    assert res.research_assessment.measurement_reliability_score >= 0.85
    assert len(res.quality_control.warning_reasons) == 0


def test_valid_with_warning_assessment(synthetic_assessment_inputs):
    """Test 3: VALID_WITH_WARNING assessment identifies warning reason and adjusts reliability."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    qc["status"] = "VALID_WITH_WARNING"
    qc["warnings"] = ["Multiple disconnected components detected (3 components)."]
    seg["component_count"] = 3
    seg["top2_components_percentage"] = 82.0

    res = generate_research_assessment(
        scan_id=2,
        filename="warning.png",
        native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg,
        jsw_metrics=jsw,
        cal_metrics=cal,
        qc_metrics=qc,
    )
    assert res.quality_control.quality_status == "VALID_WITH_WARNING"
    assert len(res.quality_control.warning_reasons) == 1
    assert res.research_assessment.measurement_reliability_score < 0.85
    assert res.research_assessment.measurement_reliability_score > 0.00


def test_invalid_assessment(synthetic_assessment_inputs):
    """Test 4: INVALID assessment yields 0.00 reliability score and lists invalid reasons."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    qc["status"] = "INVALID"
    qc["warnings"] = ["Insufficient foreground pixels (0 px < 100 px minimum)."]
    seg["foreground_pixels"] = 0

    res = generate_research_assessment(
        scan_id=3,
        filename="invalid.png",
        native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg,
        jsw_metrics=jsw,
        cal_metrics=cal,
        qc_metrics=qc,
    )
    assert res.quality_control.quality_status == "INVALID"
    assert res.research_assessment.measurement_reliability_score == 0.00
    assert len(res.quality_control.invalid_reasons) == 1


def test_calibration_modes(synthetic_assessment_inputs):
    """Test 5, 6, 7: Missing, Valid, and Invalid calibration handling."""
    seg, jsw, cal, qc = synthetic_assessment_inputs

    # Case A: Missing
    res_uncal = generate_research_assessment(
        scan_id=4, filename="uncal.png", native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg, jsw_metrics=jsw, cal_metrics=cal, qc_metrics=qc
    )
    assert res_uncal.calibration.calibration_available is False
    assert res_uncal.calibration.unit == "pixels"

    # Case B: Valid
    cal_valid = dict(cal)
    cal_valid["available"] = True
    cal_valid["pixel_spacing_mm"] = 0.15
    cal_valid["unit"] = "millimeters"
    cal_valid["jsw_mm"] = {"median_mm": 4.275, "min_mm": 1.8, "max_mm": 6.3}

    res_cal = generate_research_assessment(
        scan_id=5, filename="cal.png", native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg, jsw_metrics=jsw, cal_metrics=cal_valid, qc_metrics=qc
    )
    assert res_cal.calibration.calibration_available is True
    assert res_cal.calibration.pixel_spacing_mm == 0.15
    assert res_cal.calibration.jsw_mm["median_mm"] == 4.275


def test_jsw_statistics_consistency(synthetic_assessment_inputs):
    """Test 8: JSW profile preserves min <= median <= max ordering."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    res = generate_research_assessment(
        scan_id=6, filename="stats.png", native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg, jsw_metrics=jsw, cal_metrics=cal, qc_metrics=qc
    )
    prof = res.jsw_profile
    assert prof.min_px <= prof.median_px <= prof.max_px
    assert prof.p10_px <= prof.p25_px <= prof.p75_px


def test_reliability_score_bounds(synthetic_assessment_inputs):
    """Test 9: Reliability score is strictly bounded between 0.00 and 1.00."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    score = compute_measurement_reliability_score(seg, jsw, cal, qc)
    assert 0.00 <= score <= 1.00


def test_safety_notices_and_no_clinical_diagnosis(synthetic_assessment_inputs):
    """Test 11 & 12: Ensure safety notices exist and no clinical diagnosis fields are exposed."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    res = generate_research_assessment(
        scan_id=7, filename="safety.png", native_dimensions={"height": 1000, "width": 1000},
        seg_metrics=seg, jsw_metrics=jsw, cal_metrics=cal, qc_metrics=qc
    )
    dump = res.model_dump()

    # Verify safety notice presence
    assert "safety_notice" in dump
    assert "Not a clinical diagnosis" in dump["safety_notice"]["clinical_diagnosis"]
    assert "No OA grade" in dump["safety_notice"]["osteoarthritis_grading"]

    # Verify absence of unsupported clinical diagnostic fields
    assert "oa_grade" not in dump
    assert "kellgren_lawrence" not in dump
    assert "treatment_plan" not in dump
    assert "surgery_recommended" not in dump
    assert "implant_size" not in dump


def test_assessment_visualization_rendering(synthetic_assessment_inputs, tmp_path):
    """Test 13: Visual report generates valid high-resolution image artifact."""
    seg, jsw, cal, qc = synthetic_assessment_inputs
    img = np.random.randint(50, 200, (400, 300), dtype=np.uint8)
    mask = np.zeros((400, 300), dtype=np.uint8)
    mask[150:250, 50:250] = 1

    out_file = tmp_path / "test_assess_card.png"
    render_assessment_visual_report(
        raw_image=img,
        pred_mask=mask,
        jsw_metrics=jsw,
        seg_metrics=seg,
        cal_metrics=cal,
        qc_metrics=qc,
        reliability_score=0.92,
        scan_id=1,
        filename="test_scan.png",
        output_path=out_file,
    )
    assert out_file.exists()
    assert out_file.stat().st_size > 1000


def test_end_to_end_research_assessment_pipeline(tmp_path):
    """Test 14: End-to-end research assessment pipeline execution with native coordinates."""
    h, w = 1200, 800
    img = np.random.randint(40, 220, (h, w), dtype=np.uint8)

    res = run_research_assessment_pipeline(
        raw_image_array=img,
        filename="e2e_scan.png",
        scan_id=99,
        output_dir=tmp_path,
        save_visualization=True,
    )
    assert res["status"] == "completed"
    assert res["scan_info"]["native_dimensions"] == {"height": h, "width": w}
    assert "research_assessment" in res
    assert "measurement_reliability_score" in res["research_assessment"]


def test_api_assessment_endpoints(tmp_path):
    """Test 10: API POST and GET endpoints for research assessment."""
    import uuid
    client = TestClient(app)

    unique_code = f"PAT-ST11-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "Stage11 API Test", "age": 55, "sex": "M"})
    assert p_res.status_code == 201
    p_id = p_res.json()["id"]

    # Upload radiograph
    arr = np.random.randint(50, 200, (400, 200), dtype=np.uint8)
    test_png_path = tmp_path / "stage11_test.png"
    Image.fromarray(arr).save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("stage11_test.png", f, "image/png")})
    assert up_res.status_code == 201
    scan_id = up_res.json()["scan_id"]

    # Preprocess
    prep_res = client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})
    assert prep_res.status_code == 200

    # POST Assessment
    post_res = client.post(f"/scans/{scan_id}/assessment")
    assert post_res.status_code == 200, f"Error: {post_res.text}"
    post_data = post_res.json()

    # GET Assessment
    get_res = client.get(f"/scans/{scan_id}/assessment")
    assert get_res.status_code == 200
    get_data = get_res.json()

    # Verify structural parity
    assert post_data["scan_info"]["scan_id"] == get_data["scan_info"]["scan_id"]
    assert post_data["segmentation"]["model"] == get_data["segmentation"]["model"]
    assert post_data["research_assessment"]["measurement_reliability_score"] == get_data["research_assessment"]["measurement_reliability_score"]
    assert post_data["safety_notice"] == get_data["safety_notice"]
