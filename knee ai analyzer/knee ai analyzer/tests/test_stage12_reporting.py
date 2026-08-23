"""
Stage 12 Comprehensive Test Suite: End-to-End Knee Analysis Reports, Patient Summary & Export.
Covers:
1. End-to-end report generation
2. Report schema validation
3. JSON serialization
4. Missing calibration
5. Valid calibration
6. Invalid calibration
7. INVALID measurement report
8. VALID_WITH_WARNING report
9. VALID report
10. PDF generation
11. API POST report
12. API GET report
13. JSON export
14. PDF export
15. Safety disclaimer presence
16. No unsupported OA diagnosis
17. No surgical recommendation
18. No fabricated millimeter values
19. Native-space dimensions
20. Deterministic report generation
"""

import json
from pathlib import Path
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.reporting.schemas import KneeAnalysisReport
from app.services.reporting.pdf_report import generate_pdf_report
from app.services.reporting.knee_report import generate_complete_knee_report


def create_synthetic_knee_radiograph(h: int = 1000, w: int = 800) -> np.ndarray:
    """Helper: creates a synthetic knee image array."""
    img = np.random.randint(40, 220, (h, w), dtype=np.uint8)
    return img


def test_1_end_to_end_report_generation(tmp_path):
    """Test 1: End-to-end report generation produces a valid KneeAnalysisReport."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="test_knee_scan.png",
        scan_id=101,
        patient_id=42,
        patient_code="PAT-0042",
        output_dir=tmp_path,
        generate_pdf=True,
    )

    assert isinstance(report, KneeAnalysisReport)
    assert report.report_id.startswith("RPT-101-")
    assert report.patient_scan_info.patient_code == "PAT-0042"
    assert report.patient_scan_info.scan_id == 101
    assert report.image_information.native_width == 800
    assert report.image_information.native_height == 1000
    assert report.segmentation.quality in ["HIGH", "MODERATE", "LOW", "INVALID"]
    assert report.quality_control.status in ["VALID", "VALID_WITH_WARNING", "INVALID"]


def test_2_report_schema_validation(tmp_path):
    """Test 2: Report schema contains all required Pydantic subfields."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="schema_scan.png",
        scan_id=1,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    report_dict = report.model_dump()
    assert "patient_scan_info" in report_dict
    assert "image_information" in report_dict
    assert "model_information" in report_dict
    assert "segmentation" in report_dict
    assert "geometry" in report_dict
    assert "jsw_measurements" in report_dict
    assert "calibration" in report_dict
    assert "quality_control" in report_dict
    assert "research_assessment" in report_dict
    assert "processing" in report_dict
    assert "safety_notice" in report_dict


def test_3_json_serialization_and_deserialization(tmp_path):
    """Test 3: Report can serialize to JSON and deserialize back losslessly."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="json_test.png",
        scan_id=5,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    json_str = report.model_dump_json()
    loaded_dict = json.loads(json_str)
    reconstructed = KneeAnalysisReport(**loaded_dict)
    assert reconstructed.report_id == report.report_id
    assert reconstructed.jsw_measurements.median_px == report.jsw_measurements.median_px


def test_4_missing_calibration_safety(tmp_path):
    """Test 4: Missing pixel spacing defaults strictly to pixels."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="uncalibrated.png",
        pixel_spacing=None,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert report.calibration.available is False
    assert report.calibration.unit == "pixels"
    assert report.calibration.pixel_spacing_mm is None
    assert "pixels" in report.calibration.notice.lower() or "requires" in report.calibration.notice.lower()
    assert report.jsw_measurements.unit == "pixels"


def test_5_valid_calibration_integration(tmp_path):
    """Test 5: Valid pixel spacing converts measurements properly."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="calibrated.png",
        pixel_spacing=[0.14, 0.14],
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert report.calibration.available is True
    assert report.calibration.pixel_spacing_mm == 0.14
    assert report.calibration.unit in ["millimeters", "mm"]
    if report.jsw_measurements.median_px is not None:
        assert report.calibration.jsw_mm is not None
        assert report.calibration.jsw_mm["median_mm"] == pytest.approx(report.jsw_measurements.median_px * 0.14, rel=1e-3)


@pytest.mark.parametrize("invalid_spacing", [[0.0, 0.0], [-0.15, -0.15], ["a", "b"], [0.15], None])
def test_6_invalid_calibration_rejection_safety(tmp_path, invalid_spacing):
    """Test 6: Invalid spacing values are safely rejected and fall back to pixels."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="invalid_cal.png",
        pixel_spacing=invalid_spacing,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert report.calibration.available is False
    assert report.calibration.unit == "pixels"
    assert report.calibration.pixel_spacing_mm is None


def test_7_invalid_measurement_report_handling(tmp_path):
    """Test 7: Empty mask produces INVALID report with 0.00 reliability score."""
    arr = np.zeros((600, 500), dtype=np.uint8)  # pure black image -> empty mask
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="empty_mask.png",
        scan_id=999,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert report.quality_control.status == "INVALID"
    assert report.research_assessment.measurement_reliability_score == 0.00
    assert report.quality_control.is_valid is False
    assert len(report.quality_control.invalid_reasons) > 0


def test_8_valid_with_warning_report_handling(tmp_path):
    """Test 8: Report accurately surfaces warning reasons and sets reliability score."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="warning_test.png",
        scan_id=12,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    if report.quality_control.status == "VALID_WITH_WARNING":
        assert len(report.quality_control.warning_reasons) > 0
        assert 0.00 < report.research_assessment.measurement_reliability_score < 1.00


def test_9_valid_nominal_report_handling(tmp_path):
    """Test 9: Nominal report generates cleanly with positive reliability score."""
    arr = create_synthetic_knee_radiograph(h=1024, w=768)
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="nominal_scan.png",
        scan_id=10,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert 0.00 <= report.research_assessment.measurement_reliability_score <= 1.00
    assert len(report.research_assessment.observations) > 0


def test_10_pdf_generation_file_creation(tmp_path):
    """Test 10: PDF document is successfully compiled to disk."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="pdf_test.png",
        scan_id=77,
        output_dir=tmp_path,
        generate_pdf=True,
    )

    assert report.pdf_report_path is not None
    pdf_p = Path(report.pdf_report_path)
    assert pdf_p.exists()
    assert pdf_p.stat().st_size > 1000  # Non-trivial PDF binary size


def test_11_api_post_report_endpoint(tmp_path):
    """Test 11: POST /scans/{scan_id}/report executes pipeline and returns report JSON."""
    import uuid
    client = TestClient(app)

    unique_code = f"PAT-RPT-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "Report Patient", "age": 60, "sex": "F"})
    assert p_res.status_code == 201
    p_id = p_res.json()["id"]

    arr = np.random.randint(50, 200, (500, 400), dtype=np.uint8)
    test_png_path = tmp_path / "post_report_test.png"
    Image.fromarray(arr).save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("post_report_test.png", f, "image/png")})
    assert up_res.status_code == 201
    scan_id = up_res.json()["scan_id"]

    # Preprocess
    prep_res = client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})
    assert prep_res.status_code == 200

    # POST Report
    post_res = client.post(f"/scans/{scan_id}/report")
    assert post_res.status_code == 200, f"Error: {post_res.text}"
    data = post_res.json()
    assert data["report_id"].startswith(f"RPT-{scan_id}-")
    assert "segmentation" in data
    assert "quality_control" in data


def test_12_api_get_report_endpoint(tmp_path):
    """Test 12: GET /scans/{scan_id}/report retrieves structured report."""
    import uuid
    client = TestClient(app)

    unique_code = f"PAT-GET-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "Get Patient", "age": 63, "sex": "M"})
    p_id = p_res.json()["id"]

    arr = np.random.randint(50, 200, (500, 400), dtype=np.uint8)
    test_png_path = tmp_path / "get_report_test.png"
    Image.fromarray(arr).save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("get_report_test.png", f, "image/png")})
    scan_id = up_res.json()["scan_id"]

    client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})

    get_res = client.get(f"/scans/{scan_id}/report")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["patient_scan_info"]["scan_id"] == scan_id


def test_13_api_export_json_endpoint(tmp_path):
    """Test 13: GET /scans/{scan_id}/report/json returns JSON file attachment."""
    import uuid
    client = TestClient(app)

    unique_code = f"PAT-JSON-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "JSON Export Patient", "age": 50, "sex": "F"})
    p_id = p_res.json()["id"]

    arr = np.random.randint(50, 200, (400, 300), dtype=np.uint8)
    test_png_path = tmp_path / "json_export_test.png"
    Image.fromarray(arr).save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("json_export_test.png", f, "image/png")})
    scan_id = up_res.json()["scan_id"]

    client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})

    # Trigger report generation
    client.post(f"/scans/{scan_id}/report")

    json_res = client.get(f"/scans/{scan_id}/report/json")
    assert json_res.status_code == 200
    assert "application/json" in json_res.headers["content-type"]
    parsed = json.loads(json_res.content.decode("utf-8"))
    assert parsed["patient_scan_info"]["scan_id"] == scan_id


def test_14_api_export_pdf_endpoint(tmp_path):
    """Test 14: GET /scans/{scan_id}/report/pdf returns PDF file attachment."""
    import uuid
    client = TestClient(app)

    unique_code = f"PAT-PDF-{uuid.uuid4().hex[:6]}"
    p_res = client.post("/patients/", json={"patient_code": unique_code, "name": "PDF Export Patient", "age": 70, "sex": "M"})
    p_id = p_res.json()["id"]

    arr = np.random.randint(50, 200, (400, 300), dtype=np.uint8)
    test_png_path = tmp_path / "pdf_export_test.png"
    Image.fromarray(arr).save(test_png_path)

    with open(test_png_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("pdf_export_test.png", f, "image/png")})
    scan_id = up_res.json()["scan_id"]

    client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})

    # Trigger report generation
    client.post(f"/scans/{scan_id}/report")

    pdf_res = client.get(f"/scans/{scan_id}/report/pdf")
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]
    assert len(pdf_res.content) > 1000


def test_15_safety_disclaimer_presence(tmp_path):
    """Test 15: Safety disclaimer is explicitly present in schema and texts."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="disclaimer_test.png",
        scan_id=88,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert "NOT FOR CLINICAL DIAGNOSIS" in report.research_assessment.clinical_disclaimer
    assert "prototype" in report.safety_notice["disclaimer_text"].lower()


def test_16_no_unsupported_oa_diagnosis_assigned(tmp_path):
    """Test 16: Ensure no Kellgren-Lawrence grades or OA diagnoses are assigned."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="no_oa_test.png",
        scan_id=89,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    report_str = report.model_dump_json().lower()
    assert "kellgren" not in report_str
    assert "grade 1" not in report_str
    assert "grade 2" not in report_str
    assert "grade 3" not in report_str
    assert "grade 4" not in report_str


def test_17_no_surgical_or_implant_recommendation(tmp_path):
    """Test 17: Ensure no surgical recommendations or implant sizing are output."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="no_surgery_test.png",
        scan_id=90,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    report_str = report.model_dump_json().lower()
    assert "arthroplasty" not in report_str
    assert "implant size" not in report_str
    assert "surgery recommended" not in report_str


def test_18_no_fabricated_millimeter_values(tmp_path):
    """Test 18: No millimeter values exist when uncalibrated."""
    arr = create_synthetic_knee_radiograph()
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="uncalibrated_check.png",
        pixel_spacing=None,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert report.calibration.jsw_mm is None or all(v is None for v in report.calibration.jsw_mm.values())
    assert report.calibration.pixel_spacing_mm is None
    assert report.jsw_measurements.unit == "pixels"


def test_19_native_space_dimension_preservation(tmp_path):
    """Test 19: Native radiograph dimensions are preserved accurately."""
    h, w = 1350, 920
    arr = create_synthetic_knee_radiograph(h=h, w=w)
    report = generate_complete_knee_report(
        raw_image_array=arr,
        filename="dims_test.png",
        scan_id=91,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert report.image_information.native_height == h
    assert report.image_information.native_width == w


def test_20_deterministic_report_generation(tmp_path):
    """Test 20: Repeated report generation on identical input yields identical metrics."""
    arr = create_synthetic_knee_radiograph(h=800, w=600)
    rep1 = generate_complete_knee_report(
        raw_image_array=arr,
        filename="deterministic.png",
        scan_id=92,
        output_dir=tmp_path,
        generate_pdf=False,
    )
    rep2 = generate_complete_knee_report(
        raw_image_array=arr,
        filename="deterministic.png",
        scan_id=92,
        output_dir=tmp_path,
        generate_pdf=False,
    )

    assert rep1.jsw_measurements.median_px == rep2.jsw_measurements.median_px
    assert rep1.jsw_measurements.min_px == rep2.jsw_measurements.min_px
    assert rep1.jsw_measurements.max_px == rep2.jsw_measurements.max_px
    assert rep1.research_assessment.measurement_reliability_score == rep2.research_assessment.measurement_reliability_score
