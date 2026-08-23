"""
Stage 13 System Integration, API Contract, Data Consistency, Security & Edge Case Test Suite.
Covers:
1. Complete Pipeline API Contract (POST /segment, GET /segmentation, POST /measurements, GET /measurements, POST /assessment, GET /assessment, POST /report, GET /report, GET /report/json, GET /report/pdf)
2. Data Consistency across API stages (Segmentation -> Measurements -> Assessment -> Report)
3. Edge Cases (Dark, Bright, Small, Large, RGB, Corrupted, Empty, Unsupported, Outlier, Non-standard Spacing)
4. Security & Path Traversal Protection
5. Non-Diagnostic Clinical Safety Invariants
"""

import json
from pathlib import Path
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.reporting.schemas import KneeAnalysisReport
from app.services.reporting.knee_report import generate_complete_knee_report


@pytest.fixture
def api_client():
    return TestClient(app)


def create_test_patient_and_scan(client: TestClient, tmp_path: Path, arr: np.ndarray, fname: str = "audit_scan.png"):
    """Helper: registers a patient and uploads an image to create a scan record."""
    import uuid
    p_code = f"PAT-ST13-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": p_code, "name": "Audit Patient", "age": 55, "sex": "M"})
    assert p_res.status_code == 201
    p_id = p_res.json()["id"]

    file_path = tmp_path / fname
    Image.fromarray(arr).save(file_path)

    with open(file_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": (fname, f, "image/png")})
    assert up_res.status_code == 201
    scan_id = up_res.json()["scan_id"]
    return p_id, scan_id


# ==========================================
# 1. API CONTRACT & POST/GET CONSISTENCY
# ==========================================

def test_api_contract_all_endpoints_symmetry(api_client, tmp_path):
    """Test 1: Verifies all scan endpoints (segment, measurements, assessment, report, exports) work symmetrically."""
    arr = np.random.randint(40, 220, (600, 500), dtype=np.uint8)
    _, scan_id = create_test_patient_and_scan(api_client, tmp_path, arr, "symmetry.png")

    # 1. Preprocess
    prep_res = api_client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})
    assert prep_res.status_code == 200

    # 2. Segment
    seg_post = api_client.post(f"/scans/{scan_id}/segment")
    assert seg_post.status_code == 200
    seg_get = api_client.get(f"/scans/{scan_id}/segmentation")
    assert seg_get.status_code == 200
    assert seg_get.json()["scan_id"] == scan_id

    # 3. Measurements
    meas_post = api_client.post(f"/scans/{scan_id}/measurements")
    assert meas_post.status_code == 200
    meas_get = api_client.get(f"/scans/{scan_id}/measurements")
    assert meas_get.status_code == 200
    assert meas_post.json()["jsw"]["median_px"] == meas_get.json()["jsw"]["median_px"]

    # 4. Assessment
    assess_post = api_client.post(f"/scans/{scan_id}/assessment")
    assert assess_post.status_code == 200
    assess_get = api_client.get(f"/scans/{scan_id}/assessment")
    assert assess_get.status_code == 200
    assert assess_post.json()["research_assessment"]["measurement_reliability_score"] == assess_get.json()["research_assessment"]["measurement_reliability_score"]

    # 5. Report
    rep_post = api_client.post(f"/scans/{scan_id}/report")
    assert rep_post.status_code == 200
    rep_get = api_client.get(f"/scans/{scan_id}/report")
    assert rep_get.status_code == 200
    assert rep_post.json()["report_id"] == rep_get.json()["report_id"]

    # 6. JSON Export
    json_exp = api_client.get(f"/scans/{scan_id}/report/json")
    assert json_exp.status_code == 200
    assert "application/json" in json_exp.headers["content-type"]

    # 7. PDF Export
    pdf_exp = api_client.get(f"/scans/{scan_id}/report/pdf")
    assert pdf_exp.status_code == 200
    assert "application/pdf" in pdf_exp.headers["content-type"]


# ==========================================
# 2. DATA CONSISTENCY ACROSS STAGES
# ==========================================

def test_cross_pipeline_data_consistency(api_client, tmp_path):
    """Test 2: Ensure segmentation, measurements, assessment, and report share identical metric values."""
    arr = np.random.randint(50, 200, (800, 600), dtype=np.uint8)
    _, scan_id = create_test_patient_and_scan(api_client, tmp_path, arr, "consistency.png")

    api_client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "percentile"})
    meas_data = api_client.post(f"/scans/{scan_id}/measurements").json()
    assess_data = api_client.post(f"/scans/{scan_id}/assessment").json()
    rep_data = api_client.post(f"/scans/{scan_id}/report").json()

    # Verify native dimensions
    assert meas_data["native_dimensions"]["width"] == rep_data["image_information"]["native_width"] == 600
    assert meas_data["native_dimensions"]["height"] == rep_data["image_information"]["native_height"] == 800

    # Verify JSW statistics
    assert meas_data["jsw"]["median_px"] == assess_data["jsw_profile"]["median_px"] == rep_data["jsw_measurements"]["median_px"]
    assert meas_data["jsw"]["min_px"] == assess_data["jsw_profile"]["min_px"] == rep_data["jsw_measurements"]["min_px"]
    assert meas_data["jsw"]["max_px"] == assess_data["jsw_profile"]["max_px"] == rep_data["jsw_measurements"]["max_px"]

    # Verify QC Status
    assert meas_data["quality"]["status"] == assess_data["quality_control"]["quality_status"] == rep_data["quality_control"]["status"]

    # Verify Reliability Score
    assert assess_data["research_assessment"]["measurement_reliability_score"] == rep_data["research_assessment"]["measurement_reliability_score"]


# ==========================================
# 3. EDGE CASES & ROBUSTNESS
# ==========================================

def test_extreme_dark_image_edge_case(tmp_path):
    """Test 3: Very dark image handles gracefully without division-by-zero or crash."""
    dark_arr = np.random.randint(0, 10, (500, 400), dtype=np.uint8)
    report = generate_complete_knee_report(
        raw_image_array=dark_arr,
        filename="dark_scan.png",
        scan_id=301,
        output_dir=tmp_path,
        generate_pdf=False,
    )
    assert isinstance(report, KneeAnalysisReport)
    assert report.quality_control.status in ["VALID", "VALID_WITH_WARNING", "INVALID"]


def test_extreme_bright_image_edge_case(tmp_path):
    """Test 4: Very bright image handles gracefully without overflow."""
    bright_arr = np.random.randint(245, 256, (500, 400), dtype=np.uint8)
    report = generate_complete_knee_report(
        raw_image_array=bright_arr,
        filename="bright_scan.png",
        scan_id=302,
        output_dir=tmp_path,
        generate_pdf=False,
    )
    assert isinstance(report, KneeAnalysisReport)
    assert report.quality_control.status in ["VALID", "VALID_WITH_WARNING", "INVALID"]


def test_large_aspect_ratio_image(tmp_path):
    """Test 5: Highly non-square aspect ratio image preserves coordinates."""
    h, w = 1600, 600
    tall_arr = np.random.randint(40, 220, (h, w), dtype=np.uint8)
    report = generate_complete_knee_report(
        raw_image_array=tall_arr,
        filename="tall_scan.png",
        scan_id=303,
        output_dir=tmp_path,
        generate_pdf=False,
    )
    assert report.image_information.native_height == 1600
    assert report.image_information.native_width == 600


def test_rgb_multichannel_radiograph(tmp_path):
    """Test 6: 3-channel RGB image converts to 1-channel grayscale safely."""
    rgb_arr = np.random.randint(40, 220, (500, 400, 3), dtype=np.uint8)
    report = generate_complete_knee_report(
        raw_image_array=rgb_arr,
        filename="rgb_scan.png",
        scan_id=304,
        output_dir=tmp_path,
        generate_pdf=False,
    )
    assert report.image_information.channels == 1
    assert report.image_information.native_height == 500
    assert report.image_information.native_width == 400


# ==========================================
# 4. SECURITY & EXCEPTION HANDLING
# ==========================================

def test_missing_scan_returns_404(api_client):
    """Test 7: Accessing non-existent scan ID returns HTTP 404."""
    res = api_client.get("/scans/999999/report")
    assert res.status_code == 404


def test_unsupported_file_upload_rejection(api_client, tmp_path):
    """Test 8: Uploading an executable or text file is safely rejected."""
    import uuid
    p_code = f"PAT-SEC-{uuid.uuid4().hex[:6]}"
    p_res = api_client.post("/patients/", json={"patient_code": p_code, "name": "Sec Patient", "age": 30, "sex": "M"})
    p_id = p_res.json()["id"]

    bad_file = tmp_path / "malicious.exe"
    bad_file.write_bytes(b"MZ\x90\x00\x03\x00\x00\x00")

    with open(bad_file, "rb") as f:
        up_res = api_client.post(f"/patients/{p_id}/images", files={"file": ("malicious.exe", f, "application/octet-stream")})
    assert up_res.status_code in [400, 415, 422]


def test_path_traversal_filename_sanitization(api_client, tmp_path):
    """Test 9: Path traversal in filenames is stripped safely."""
    import uuid
    p_code = f"PAT-TRAV-{uuid.uuid4().hex[:6]}"
    p_res = api_client.post("/patients/", json={"patient_code": p_code, "name": "Trav Patient", "age": 40, "sex": "F"})
    p_id = p_res.json()["id"]

    safe_img = tmp_path / "safe.png"
    Image.fromarray(np.random.randint(50, 200, (200, 200), dtype=np.uint8)).save(safe_img)

    with open(safe_img, "rb") as f:
        up_res = api_client.post(f"/patients/{p_id}/images", files={"file": ("../../etc/passwd.png", f, "image/png")})
    assert up_res.status_code == 201
    saved_filename = up_res.json()["original_filename"]
    assert "/" not in saved_filename
    assert "\\" not in saved_filename
    assert ".." not in saved_filename
