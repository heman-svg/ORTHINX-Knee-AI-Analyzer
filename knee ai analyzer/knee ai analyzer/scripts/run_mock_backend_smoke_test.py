"""
Mock Image End-to-End Backend Smoke Test Runner.
Executes the full pipeline on data/validation_results/v2/mock_demo/mock_knee_xray.png.
Verifies all REST API endpoints, image transforms, segmentation, JSW profiling,
assessment generation, and PDF/JSON compilation.
"""

import sys
import time
import json
from pathlib import Path
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.main import app
from app.services.reporting.knee_report import generate_complete_knee_report


def run_mock_smoke_test():
    print("=" * 80)
    print("MOCK KNEE RADIOGRAPH END-TO-END BACKEND SMOKE TEST")
    print("=" * 80)

    mock_img_path = PROJECT_ROOT / "data" / "validation_results" / "v2" / "mock_demo" / "mock_knee_xray.png"
    if not mock_img_path.exists():
        raise FileNotFoundError(f"Mock image not found at: {mock_img_path}")

    raw_img = np.array(Image.open(mock_img_path))
    h, w = raw_img.shape[:2]
    print(f"[Phase 1] Loaded mock image fixture: {mock_img_path.name} ({w} x {h} px, {raw_img.dtype})")

    # Step 1: Direct Python Pipeline Test
    print("\n[Phase 2] Executing Complete Backend Pipeline...")
    t0 = time.perf_counter()
    report = generate_complete_knee_report(
        raw_image_array=raw_img,
        filename=mock_img_path.name,
        scan_id=999,
        patient_id=999,
        patient_code="PAT-MOCK-DEMO",
        pixel_spacing=None,
        output_dir=mock_img_path.parent,
        generate_pdf=True,
    )
    t_end = time.perf_counter()
    latency_ms = round((t_end - t0) * 1000.0, 1)

    print(f"  Report ID:           {report.report_id}")
    print(f"  Processing Latency:  {latency_ms} ms")
    print(f"  Native Dimensions:   {report.image_information.native_width} x {report.image_information.native_height}")
    print(f"  Segmentation Quality:{report.segmentation.quality} (Foreground: {report.segmentation.foreground_pixels:,} px)")
    print(f"  JSW Median:          {report.jsw_measurements.median_px} px ({report.jsw_measurements.sample_count} samples)")
    print(f"  QC Status:           {report.quality_control.status} (Valid: {report.quality_control.is_valid})")
    print(f"  Reliability Score:   {report.research_assessment.measurement_reliability_score:.2f} / 1.00")
    print(f"  Calibration Unit:    {report.calibration.unit} (Available: {report.calibration.available})")
    print(f"  PDF Generated:       {Path(report.pdf_report_path).exists()} ({Path(report.pdf_report_path).stat().st_size:,} bytes)")
    print(f"  JSON Generated:      {Path(report.json_report_path).exists()} ({Path(report.json_report_path).stat().st_size:,} bytes)")
    print(f"  Visual Card:         {Path(report.visualization_path).exists()}")

    # Step 2: REST API Full Tier Integration Test
    print("\n[Phase 3] Executing REST API Endpoints Verification...")
    client = TestClient(app)

    # 1. Create Patient
    p_res = client.post("/patients/", json={
        "patient_code": "PAT-SMOKE-MOCK",
        "name": "Synthetic Demo Patient",
        "age": 50,
        "sex": "M"
    })
    assert p_res.status_code == 201, f"Patient creation failed: {p_res.text}"
    p_id = p_res.json()["id"]

    # 2. Upload Image
    with open(mock_img_path, "rb") as f:
        up_res = client.post(f"/patients/{p_id}/images", files={"file": ("mock_knee_xray.png", f, "image/png")})
    assert up_res.status_code == 201, f"Upload failed: {up_res.text}"
    scan_id = up_res.json()["scan_id"]
    print(f"  [+] POST /patients/{p_id}/images -> HTTP {up_res.status_code} (Scan ID: {scan_id})")

    # 3. Preprocess
    prep_res = client.post(f"/scans/{scan_id}/preprocess", json={"normalization_method": "min_max"})
    assert prep_res.status_code == 200, f"Preprocess failed: {prep_res.text}"
    print(f"  [+] POST /scans/{scan_id}/preprocess -> HTTP {prep_res.status_code}")

    # 4. Segment
    seg_post = client.post(f"/scans/{scan_id}/segment")
    assert seg_post.status_code == 200, f"Segment failed: {seg_post.text}"
    seg_get = client.get(f"/scans/{scan_id}/segmentation")
    assert seg_get.status_code == 200, f"Get segment failed: {seg_get.text}"
    print(f"  [+] POST/GET /scans/{scan_id}/segmentation -> HTTP {seg_post.status_code} / {seg_get.status_code}")

    # 5. Measurements
    meas_post = client.post(f"/scans/{scan_id}/measurements")
    assert meas_post.status_code == 200, f"Measurements failed: {meas_post.text}"
    meas_get = client.get(f"/scans/{scan_id}/measurements")
    assert meas_get.status_code == 200, f"Get measurements failed: {meas_get.text}"
    print(f"  [+] POST/GET /scans/{scan_id}/measurements -> HTTP {meas_post.status_code} / {meas_get.status_code}")

    # 6. Assessment
    assess_post = client.post(f"/scans/{scan_id}/assessment")
    assert assess_post.status_code == 200, f"Assessment failed: {assess_post.text}"
    assess_get = client.get(f"/scans/{scan_id}/assessment")
    assert assess_get.status_code == 200, f"Get assessment failed: {assess_get.text}"
    print(f"  [+] POST/GET /scans/{scan_id}/assessment -> HTTP {assess_post.status_code} / {assess_get.status_code}")

    # 7. Report
    rep_post = client.post(f"/scans/{scan_id}/report")
    assert rep_post.status_code == 200, f"Report failed: {rep_post.text}"
    rep_get = client.get(f"/scans/{scan_id}/report")
    assert rep_get.status_code == 200, f"Get report failed: {rep_get.text}"
    print(f"  [+] POST/GET /scans/{scan_id}/report -> HTTP {rep_post.status_code} / {rep_get.status_code}")

    # 8. JSON Export
    json_exp = client.get(f"/scans/{scan_id}/report/json")
    assert json_exp.status_code == 200, f"JSON export failed: {json_exp.text}"
    assert "application/json" in json_exp.headers["content-type"]
    print(f"  [+] GET /scans/{scan_id}/report/json -> HTTP {json_exp.status_code} ({len(json_exp.content):,} bytes)")

    # 9. PDF Export
    pdf_exp = client.get(f"/scans/{scan_id}/report/pdf")
    assert pdf_exp.status_code == 200, f"PDF export failed: {pdf_exp.text}"
    assert "application/pdf" in pdf_exp.headers["content-type"]
    print(f"  [+] GET /scans/{scan_id}/report/pdf -> HTTP {pdf_exp.status_code} ({len(pdf_exp.content):,} bytes)")

    print("\n" + "=" * 80)
    print("ALL MOCK SMOKE TEST PHASES COMPLETED WITH 100% SUCCESS")
    print("=" * 80)


if __name__ == "__main__":
    run_mock_smoke_test()
