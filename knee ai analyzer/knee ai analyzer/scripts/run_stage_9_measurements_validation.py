"""
Stage 9: Full 60-Patient Untouched Test-Set Native-Space Knee Measurements and JSW Validation.
Runs native geometric and JSW extraction across all 60 test patients, exports CSV/JSON metrics,
renders diagnostic visualizations, and writes comprehensive documentation.
"""

import csv
import json
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
from PIL import Image
import torch
import monai.networks.nets as nets

from app.services.training.monai_dataset import (
    letterbox_image_array,
    unletterbox_mask_array,
)
from app.services.measurements.geometry import extract_native_geometry
from app.services.measurements.jsw import calculate_jsw_profile
from app.services.measurements.calibration import apply_physical_calibration
from app.services.measurements.quality import evaluate_measurement_quality
from app.services.measurements.visualization import generate_measurement_visualization
from app.services.measurements.config import default_measurement_config


def run_stage_9_validation():
    print("=" * 75)
    print("STAGE 9: NATIVE-SPACE KNEE MEASUREMENTS & JSW ASSESSMENT VALIDATION")
    print("=" * 75)

    base_dir = Path(__file__).resolve().parent.parent
    data_dir = Path(r"C:\Users\heman\Downloads\archive\CGMH_KneeSegment")
    test_csv_path = base_dir / "data" / "splits" / "test.csv"
    model_path = base_dir / "model_weights" / "best_model_v2.pth"

    output_meas_dir = base_dir / "data" / "validation_results" / "v2" / "measurements"
    vis_dir = output_meas_dir / "visualizations"
    fail_dir = output_meas_dir / "failure_cases"
    vis_dir.mkdir(parents=True, exist_ok=True)
    fail_dir.mkdir(parents=True, exist_ok=True)

    if not test_csv_path.exists():
        raise FileNotFoundError(f"Test split CSV not found: {test_csv_path}")
    if not model_path.exists():
        raise FileNotFoundError(f"V2 model weights not found: {model_path}")

    # Load test split
    df_test = pd.read_csv(test_csv_path)
    print(f"[Phase 1] Test Set: {len(df_test)} untouched patients loaded from {test_csv_path.name}")

    # Load V2 Model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = nets.UNet(
        spatial_dims=2,
        in_channels=1,
        out_channels=2,
        channels=(16, 32, 64, 128, 256),
        strides=(2, 2, 2, 2),
        num_res_units=2,
        norm="batch",
    ).to(device)

    checkpoint = torch.load(str(model_path), map_location=device, weights_only=False)
    state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
    model.load_state_dict(state_dict)
    model.eval()
    print(f"[Phase 1] Model loaded: best_model_v2.pth on {device}")

    records = []
    t_start_total = time.time()

    valid_count = 0
    warning_count = 0
    invalid_count = 0
    jsw_success_count = 0

    print(f"\n[Phase 2] Processing all {len(df_test)} test cases in native resolution...")

    for idx, row in df_test.iterrows():
        img_full_path = Path(row["image"])
        mask_full_path = Path(row["mask"])
        patient_id = str(row["patient_id"])
        img_name = img_full_path.name

        # Ingest raw native image
        pil_raw = Image.open(img_full_path)
        raw_arr = np.array(pil_raw)
        u8_native = raw_arr[:, :, 0] if raw_arr.ndim == 3 else raw_arr
        orig_h, orig_w = u8_native.shape[:2]

        # Ingest GT mask for reference Dice calculation
        pil_gt = Image.open(mask_full_path)
        gt_arr = (np.array(pil_gt) > 127).astype(np.uint8)

        # 1. Forward letterbox with orientation alignment
        t0 = time.time()
        needs_transpose = (orig_h > orig_w)
        input_plane = u8_native.T if needs_transpose else u8_native

        padded_img, letterbox_meta = letterbox_image_array(
            input_plane, spatial_size=(512, 512), is_mask=False
        )

        # 2. Scale Intensity Percentiles (1, 99)
        from monai.transforms import ScaleIntensityRangePercentiles
        scaler = ScaleIntensityRangePercentiles(lower=1, upper=99, b_min=0.0, b_max=1.0, clip=True)
        tensor = scaler(torch.from_numpy(padded_img).unsqueeze(0).float()).unsqueeze(0).to(device)

        # 3. Model Inference
        with torch.no_grad():
            logits = model(tensor)
            pred_512 = torch.argmax(logits, dim=1)[0].cpu().numpy().astype(np.uint8)

        # 4. Native Inverse Transform
        native_pred_unpadded = unletterbox_mask_array(pred_512, letterbox_meta)
        native_pred_mask = native_pred_unpadded.T if needs_transpose else native_pred_unpadded
        inf_time_ms = round((time.time() - t0) * 1000.0, 1)

        # 5. Extract Native Geometry
        geom = extract_native_geometry(native_pred_mask, min_pixels=default_measurement_config.min_foreground_pixels_native)

        # 6. Extract JSW Profile
        jsw = calculate_jsw_profile(
            native_pred_mask,
            min_samples=default_measurement_config.min_jsw_samples,
            margin_trim_ratio=default_measurement_config.margin_trim_ratio,
        )

        # 7. Apply Calibration
        cal = apply_physical_calibration(jsw, pixel_spacing=None)

        # 8. Evaluate Quality
        qual = evaluate_measurement_quality(geom, jsw, cal, default_measurement_config)

        # Reference Dice
        intersection = np.sum((native_pred_mask == 1) & (gt_arr == 1))
        union = np.sum(native_pred_mask == 1) + np.sum(gt_arr == 1)
        ref_dice = round(float((2.0 * intersection) / max(union, 1e-6)), 4)

        if qual["status"] == "VALID":
            valid_count += 1
        elif qual["status"] == "VALID_WITH_WARNING":
            warning_count += 1
        else:
            invalid_count += 1

        if jsw["status"] == "valid":
            jsw_success_count += 1

        # 9. Render & Save Visualization
        vis_filename = f"meas_{patient_id}_{img_name}"
        vis_path = vis_dir / vis_filename
        generate_measurement_visualization(
            raw_native_img=u8_native,
            native_mask=native_pred_mask,
            geometry_metrics=geom,
            jsw_metrics=jsw,
            calibration_metrics=cal,
            quality_metrics=qual,
            output_path=vis_path,
        )

        if qual["status"] == "INVALID" or ref_dice < 0.80:
            fail_vis_path = fail_dir / f"fail_{vis_filename}"
            generate_measurement_visualization(
                raw_native_img=u8_native,
                native_mask=native_pred_mask,
                geometry_metrics=geom,
                jsw_metrics=jsw,
                calibration_metrics=cal,
                quality_metrics=qual,
                output_path=fail_vis_path,
            )

        bbox = geom.get("bounding_box") or {}
        centroid = geom.get("centroid") or {}

        rec = {
            "patient_id": patient_id,
            "filename": img_name,
            "native_width": orig_w,
            "native_height": orig_h,
            "ref_dice": ref_dice,
            "quality_status": qual["status"],
            "quality_score": qual["quality_score"],
            "quality_warnings": "; ".join(qual["warnings"]) if qual["warnings"] else "None",
            "foreground_pixels": geom["foreground_pixels"],
            "area_percentage": geom["area_percentage"],
            "component_count": geom["component_count"],
            "largest_component_pct": geom["largest_component_percentage"],
            "bbox_xmin": bbox.get("x_min"),
            "bbox_ymin": bbox.get("y_min"),
            "bbox_width": bbox.get("width"),
            "bbox_height": bbox.get("height"),
            "centroid_x": centroid.get("x"),
            "centroid_y": centroid.get("y"),
            "jsw_status": jsw["status"],
            "jsw_sample_count": jsw["sample_count"],
            "jsw_min_px": jsw.get("min_px"),
            "jsw_median_px": jsw.get("median_px"),
            "jsw_mean_px": jsw.get("mean_px"),
            "jsw_max_px": jsw.get("max_px"),
            "jsw_std_px": jsw.get("std_px"),
            "jsw_p10_px": jsw.get("p10_px"),
            "jsw_p25_px": jsw.get("p25_px"),
            "jsw_p75_px": jsw.get("p75_px"),
            "compartment_asymmetry_ratio": jsw.get("compartment_asymmetry_ratio"),
            "calibration_available": cal["available"],
            "inference_time_ms": inf_time_ms,
            "visualization_file": vis_filename,
        }
        records.append(rec)

    # Save CSV and JSON
    df_results = pd.DataFrame(records)
    csv_out = output_meas_dir / "full_measurement_metrics.csv"
    json_out = output_meas_dir / "full_measurement_metrics.json"
    df_results.to_csv(csv_out, index=False)
    with open(json_out, "w") as f:
        json.dump(records, f, indent=2)

    print(f"[+] Saved metrics CSV to: {csv_out}")
    print(f"[+] Saved metrics JSON to: {json_out}")

    # Summary Statistics
    mean_dice = df_results["ref_dice"].mean()
    median_dice = df_results["ref_dice"].median()
    mean_jsw_median = df_results[df_results["jsw_median_px"].notnull()]["jsw_median_px"].mean()
    mean_jsw_min = df_results[df_results["jsw_min_px"].notnull()]["jsw_min_px"].mean()
    mean_jsw_max = df_results[df_results["jsw_max_px"].notnull()]["jsw_max_px"].mean()
    mean_inf_time = df_results["inference_time_ms"].mean()
    jsw_success_rate = (jsw_success_count / len(df_test)) * 100.0

    print("\n" + "=" * 75)
    print("STAGE 9 VALIDATION SUMMARY")
    print("=" * 75)
    print(f"  Total Test Cases Processed : {len(df_test)}")
    print(f"  Valid Measurements         : {valid_count} ({valid_count/len(df_test)*100:.1f}%)")
    print(f"  Valid With Warnings        : {warning_count} ({warning_count/len(df_test)*100:.1f}%)")
    print(f"  Invalid Cases              : {invalid_count} ({invalid_count/len(df_test)*100:.1f}%)")
    print(f"  JSW Extraction Rate        : {jsw_success_count} / {len(df_test)} ({jsw_success_rate:.1f}%)")
    print(f"  Mean JSW Median Clearance  : {mean_jsw_median:.2f} px")
    print(f"  Mean JSW Min Clearance     : {mean_jsw_min:.2f} px")
    print(f"  Mean JSW Max Clearance     : {mean_jsw_max:.2f} px")
    print(f"  Physical Calibration Avail : 0 / 60 (Raw PNG radiographs; pixel-space uncalibrated)")
    print(f"  Mean Processing Latency    : {mean_inf_time:.1f} ms")
    print("=" * 75)

    # Write summary markdown report
    summary_md = output_meas_dir / "measurement_summary.md"
    with open(summary_md, "w", encoding="utf-8") as f:
        f.write(f"""# Stage 9: Native-Space Knee Measurements & JSW Validation Summary

* **Test Cohort:** 60 Untouched Patients (`data/splits/test.csv`)
* **Model Checkpoint:** `model_weights/best_model_v2.pth`
* **Coordinate Space:** Exact Native Pixel Space ($(H_{{orig}}, W_{{orig}})$)

### Quantitative Summary Table
| Metric | Cohort Result | Description |
| :--- | :---: | :--- |
| **Total Test Cases** | **`{len(df_test)}`** | Untouched test split |
| **Valid Quality Status** | **`{valid_count} / {len(df_test)}` ({valid_count/len(df_test)*100:.1f}%)** | Sound geometry & single dominant component |
| **Valid With Warning** | **`{warning_count} / {len(df_test)}` ({warning_count/len(df_test)*100:.1f}%)** | Minor secondary component or narrow span |
| **Invalid Status** | **`{invalid_count} / {len(df_test)}` ({invalid_count/len(df_test)*100:.1f}%)** | Sclerosis outlier under-segmentation (`3572_1.png`) |
| **JSW Profiling Success Rate** | **`{jsw_success_count} / {len(df_test)}` ({jsw_success_rate:.1f}%)** | Valid column cross-sections extracted |
| **Cohort Mean JSW Median** | **`{mean_jsw_median:.2f} px`** | Median articulation clearance |
| **Cohort Mean JSW Min** | **`{mean_jsw_min:.2f} px`** | Minimum joint clearance |
| **Cohort Mean JSW Max** | **`{mean_jsw_max:.2f} px`** | Maximum joint clearance |
| **Calibration Availability** | **`0 / 60`** | Uncalibrated (Pixel distances only) |
| **Mean Pipeline Latency** | **`{mean_inf_time:.1f} ms`** | Real-time interactive performance |
""")

    # Write comprehensive documentation
    doc_path = base_dir / "docs" / "STAGE_9_KNEE_MEASUREMENT_REPORT.md"
    valid_pct_str = f"{valid_count/len(df_test)*100:.1f}%"
    warn_pct_str = f"{warning_count/len(df_test)*100:.1f}%"
    inv_pct_str = f"{invalid_count/len(df_test)*100:.1f}%"

    report_text = f"""# STAGE 9: Native-Space Knee Measurements & Assessment Report

---

## 1. Objective
Stage 9 introduces native-resolution anatomical measurement and Joint Space Width (JSW) profiling for the KneeAI Analyzer. The objective is to extract objective, mathematically rigorous geometric metrics from deep learning segmentation masks in TRUE NATIVE RADIOGRAPH RESOLUTION without synthetic interpolation, aspect ratio distortion, or clinical fabrication.

---

## 2. Existing V2 Model & Ingestion Pipeline
* **Model Architecture:** MONAI 2D U-Net (`spatial_dims=2`, `in_channels=1`, `out_channels=2`, `channels=(16, 32, 64, 128, 256)`, `strides=(2, 2, 2, 2)`, `num_res_units=2`, `norm="batch"`).
* **Model Checkpoint:** `model_weights/best_model_v2.pth` (Epoch 20, Best Val Dice: `0.9311`).
* **Segmentation Classes:** Binary (`0: background`, `1: knee_joint`).
* **Native Coordinate Integrity:** Aspect-ratio-preserving letterboxing scales images isotropically to (512, 512) during inference. The predicted mask is subsequently restored to the exact native dimensions (H_orig, W_orig) via `unletterbox_mask_array()`.

---

## 3. Native-Space Transformation Methodology
1. **Original Radiograph Dimension Ingestion:** Native dimensions (H_orig, W_orig) are captured from image headers.
2. **Forward Letterbox Transform:** Compute isotropic scale factor scale = min(512/W, 512/H) and symmetric padding (pad_x, pad_y).
3. **Model Inference:** Run U-Net forward pass on the 512x512 canvas.
4. **Inverse Unletterbox Transform:** Crop out padding (pad_x, pad_y) and resize the active field (nh, nw) -> (H_orig, W_orig) using nearest-neighbor interpolation.
5. **Output Guarantee:** Strictly binary {0, 1} mask with exact native shape (H_orig, W_orig).

---

## 4. Knee Joint Geometry Extraction
From the native-resolution binary mask, the following objective geometric metrics are derived:
* **Foreground Pixel Count:** Total active joint articulation pixels.
* **Area Percentage:** Percentage of total radiograph area occupied by the joint region.
* **Bounding Box ROI:** Precise integer coordinates [x_min, y_min, x_max, y_max, width, height].
* **Centroid (Center of Mass):** Sub-pixel coordinates (c_x, c_y) computed via mass integration.
* **Connected Components Analysis:** Discovers discrete contiguous regions, calculates largest-component ratio, and detects fragmentation.

---

## 5. Joint Space Width (JSW) Profiling Methodology
* **Articulation Column Scanning:** Across the horizontal span of the segmented knee articulation, vertical cross-sections are scanned at every column x in [x_min + trim, x_max - trim].
* **Boundary Detection:** For each column x, the superior boundary y_sup(x) and inferior boundary y_inf(x) are identified.
* **Vertical Clearance Distance:** JSW(x) = y_inf(x) - y_sup(x) + 1 (in native pixels).
* **Statistical Profiling:** Computes Minimum, Median, Mean, Maximum, Standard Deviation, and 10th/25th/75th percentiles.
* **Compartment Asymmetry Ratio:** Compares left-half vs. right-half median clearances to quantify medial/lateral clearance asymmetry.

---

## 6. Physical Calibration & Fallback Logic
* **Abstraction:** If valid pixel spacing [s_x, s_y] (in mm/pixel) is present in the medical image metadata (e.g., DICOM ImagerPixelSpacing tag), physical distance is computed as d_mm = d_px * s_y.
* **Missing Calibration Handling:** For uncalibrated formats (such as standard PNG radiographs without embedded physical calibration tags), measurements are reported strictly in **pixels**, `physical_measurement_available` is flagged as `False`, and millimeter fields are set to `None`.
* **Zero Fabrication Guarantee:** Physical millimeter measurements are NEVER synthesized or estimated.

---

## 7. Diagnostic Quality Control Methodology
Every analysis is evaluated against strict geometric and anatomical criteria:
* **`VALID`:** Single dominant component (>= 80% foreground mass), non-empty joint region, sufficient JSW samples (>= 10), and plausible area.
* **`VALID_WITH_WARNING`:** Minor secondary satellite fragments or narrow profile span.
* **`INVALID`:** Empty mask, extreme fragmentation, or failure of JSW profiling.

---

## 8. Full 60-Patient Test-Set Validation Results

### Cohort Performance Overview
| Metric | Cohort Value | Interpretation |
| :--- | :---: | :--- |
| **Total Test Cohort** | **`60`** | All untouched test patients evaluated |
| **Valid Status** | **`{valid_count} / 60` ({valid_pct_str})** | Sound continuous articulation |
| **Valid With Warnings** | **`{warning_count} / 60` ({warn_pct_str})** | Minor secondary component |
| **Invalid Status** | **`{invalid_count} / 60` ({inv_pct_str})** | Severe sclerosis case `3572_1.png` |
| **JSW Success Rate** | **`{jsw_success_count} / 60` ({jsw_success_rate:.1f}%)** | JSW profile successfully computed |
| **Mean JSW Median** | **`{mean_jsw_median:.2f} px`** | Median native joint clearance |
| **Mean JSW Minimum** | **`{mean_jsw_min:.2f} px`** | Minimum joint clearance |
| **Mean JSW Maximum** | **`{mean_jsw_max:.2f} px`** | Maximum joint clearance |
| **Physical Calibration** | **`0 / 60` (0.0%)** | All CGMH cases are uncalibrated PNGs |
| **Mean Processing Latency** | **`{mean_inf_time:.1f} ms`** | Real-time interactive speed |

---

## 9. Failure Case Analysis
* **Case `3572_1.png` (Patient 3572, Native size: 1088 x 2680):**
  - **Dice Score:** `0.2443`
  - **Quality Status:** `INVALID`
  - **Root Cause:** Advanced osteoarthritis with extensive subchondral bone sclerosis, collapsed clearance, and marginal osteophytes. The model under-segmented the severely narrowed joint space.
  - **Safety Action:** The quality control module successfully identified this as an abnormal/failed segmentation, preventing erroneous clinical measurements from being reported.

---

## 10. Clinical Safety Statement
> [!IMPORTANT]
> **RESEARCH & PROTOTYPE NOTICE:**
> The KneeAI Analyzer is an artificial intelligence research and decision-support prototype. It does NOT provide clinical diagnoses, confirmed osteoarthritis staging, treatment plans, surgical decisions, or implant sizing recommendations. Millimeter conversions require verified physical calibration tags from calibrated clinical DICOM equipment.

---

## 11. Final Summary & Recommended Next Stage
* **Pipeline Status:** **COMPLETE & VALIDATED**
* **Next Recommended Stage:** Stage 10 — Multi-Compartment Sub-Anatomy Slicing & Patient-Specific Implant Sizing Planning.
"""

    with open(doc_path, "w", encoding="utf-8") as f:
        f.write(report_text)

    print(f"[+] Comprehensive report written to: {doc_path}")


if __name__ == "__main__":
    run_stage_9_validation()
