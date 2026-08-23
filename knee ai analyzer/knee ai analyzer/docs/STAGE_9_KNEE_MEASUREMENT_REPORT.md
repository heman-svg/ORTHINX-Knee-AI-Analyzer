# STAGE 9: Native-Space Knee Measurements & Assessment Report

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
5. **Output Guarantee:** Strictly binary (0, 1) mask with exact native shape (H_orig, W_orig).

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
| **Valid Status** | **`48 / 60` (80.0%)** | Sound continuous articulation |
| **Valid With Warnings** | **`9 / 60` (15.0%)** | Minor secondary component |
| **Invalid Status** | **`3 / 60` (5.0%)** | Severe sclerosis case `3572_1.png` |
| **JSW Success Rate** | **`60 / 60` (100.0%)** | JSW profile successfully computed |
| **Mean JSW Median** | **`716.69 px`** | Median native joint clearance |
| **Mean JSW Minimum** | **`209.42 px`** | Minimum joint clearance |
| **Mean JSW Maximum** | **`773.55 px`** | Maximum joint clearance |
| **Physical Calibration** | **`0 / 60` (0.0%)** | All CGMH cases are uncalibrated PNGs |
| **Mean Processing Latency** | **`179.3 ms`** | Real-time interactive speed |

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
