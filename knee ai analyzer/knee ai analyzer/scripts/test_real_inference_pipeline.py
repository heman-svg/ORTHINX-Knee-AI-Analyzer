import sys
from pathlib import Path
import json

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.services.training.dataset import load_split_csv
from app.db.database import SessionLocal
from app.models.patient import Patient
from app.models.scan import Scan


def test_real_inference_end_to_end():
    client = TestClient(app)

    print("=" * 65)
    print("TESTING REAL INFERENCE PIPELINE (INPUT -> MODEL -> RESULTS)")
    print("=" * 65)

    # 1. Load test set manifest
    test_samples = load_split_csv("data/splits/test.csv")
    if not test_samples:
        print("[-] No test samples found in data/splits/test.csv")
        return

    sample = test_samples[0]
    img_path = Path(sample["image"])
    print(f"[1] Test Set Image Selected: {img_path.name}")
    print(f"    Full Path: {img_path}")

    # 2. Create Patient via API
    patient_payload = {
        "patient_code": f"TEST-INF-{img_path.stem}",
        "name": "Test Inference Patient",
        "age": 65,
        "sex": "F",
    }
    p_res = client.post("/patients/", json=patient_payload)
    if p_res.status_code == 201:
        patient_data = p_res.json()
    else:
        # Patient already exists, fetch list
        p_list = client.get("/patients/").json()
        patient_data = next(p for p in p_list if p["patient_code"] == patient_payload["patient_code"])

    patient_id = patient_data["id"]
    print(f"[2] Patient Created / Selected: ID={patient_id}, Name='{patient_data['name']}'")

    # 3. Upload Scan via API
    with open(img_path, "rb") as f:
        upload_res = client.post(
            f"/patients/{patient_id}/images",
            files={"file": (img_path.name, f, "image/png")},
        )
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    scan_data = upload_res.json()
    scan_id = scan_data["scan_id"]
    print(f"[3] Scan Uploaded: scan_id={scan_id}, filename='{scan_data['original_filename']}'")

    # 4. Preprocess Scan via API
    prep_res = client.post(
        f"/scans/{scan_id}/preprocess",
        json={"normalization_method": "min_max"},
    )
    assert prep_res.status_code == 200, f"Preprocessing failed: {prep_res.text}"
    prep_data = prep_res.json()
    print(f"[4] Scan Preprocessed: Dimensions={prep_data['dimensions']}, Output='{prep_data['output_file']}'")

    # 5. Run Real Segmentation & Measurement Inference via API
    seg_res = client.post(f"/scans/{scan_id}/segment")
    assert seg_res.status_code == 200, f"Segmentation inference failed: {seg_res.text}"
    seg_data = seg_res.json()
    print(f"[5] AI Segmentation Completed!")
    print(f"    Status: {seg_data['status']}")
    print(f"    Model Available: {seg_data['model_available']}")
    print(f"    Structures: {seg_data['structures']}")
    print(f"    Mask Path: {seg_data['knee_joint_mask_path']}")
    print(f"    Overlay Path: {seg_data['overlay_path']}")
    print(f"    Inference Latency: {seg_data['inference_time_ms']} ms")
    print(f"    Compute Device: {seg_data['device']}")
    print("\n[6] Extracted Anatomical Measurements:")
    print(json.dumps(seg_data["measurements"], indent=4))

    # Verify physical existence of outputs
    assert Path(seg_data["knee_joint_mask_path"]).exists(), "Predicted mask file not found on disk!"
    assert Path(seg_data["overlay_path"]).exists(), "Overlay image not found on disk!"

    # Verify non-trivial predictions
    meas = seg_data["measurements"]
    assert meas["foreground_pixels"] > 0, "Foreground pixel count must be > 0"
    assert meas["mean_confidence"] > 0.5, "Confidence score must be > 0.5"
    assert meas["bounding_box"] is not None, "Bounding box must be populated"

    print("\n" + "=" * 65)
    print("[+] FULL REAL INFERENCE PIPELINE VERIFIED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    test_real_inference_end_to_end()
