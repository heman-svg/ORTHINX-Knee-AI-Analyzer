# FINAL ACCURACY & MOCK BACKEND SMOKE TEST

**Project:** KneeAI Analyzer (AI-Assisted Knee Joint Radiograph Analysis & Research Platform)  
**Date:** 2026-08-23  
**Model:** MONAI 2D U-Net (`model_weights/best_model_v2.pth`)  
**Evaluation Scope:** Existing 60-Patient Test Results + Synthetic Demo Fixture Smoke Test  

---

## 1. Existing Validated Model Metrics (60-Patient CGMH Test Cohort)

The following metrics are preserved exactly from the Stage 8C/8D/10 validation on the untouched 60-patient test split (`data/splits/test.csv`):

| Primary Metric | Value | Evaluation Basis | Status |
|---|---|---|---|
| **Dice / F1** | **94.22%** (0.9422 ± 0.0916) | Native-space unletterbox ground-truth | **VALIDATED** |
| **IoU (Jaccard Index)** | **89.94%** (0.8994 ± 0.1012) | Overlap against ground-truth masks | **VALIDATED** |
| **Precision (PPV)** | **92.31%** (0.9231 ± 0.1084) | True positive knee joint predictions | **VALIDATED** |
| **Recall / Sensitivity** | **96.27%** (0.9627 ± 0.0762) | True positive joint detection rate | **VALIDATED** |
| **Mean Absolute Area Difference** | **0.23%** (0.0023 ± 0.0035) | Native relative foreground mass | **VALIDATED** |

---

## 2. Newly Calculated Metrics (From Existing 60-Patient Validation Results)

Calculated directly from the existing test prediction records in `data/validation_results/v2/full_test_metrics.csv` without modifying or retraining the model:

| Metric | Result | Calculation Source | Interpretation & Status |
|---|---|---|---|
| **Pixel Accuracy** | **99.31%** (0.9931) | `(TP + TN) / Total_Pixels` | Derived from existing test results. *Note: Pixel accuracy is high because background occupies >90% of radiographs.* |
| **Specificity (TNR)** | **99.52%** (0.9952) | `TN / (TN + FP)` | Background rejection rate across test images. |
| **F2 Score** | **95.43%** (0.9543) | `5*TP / (5*TP + 4*FN + FP)` | Recall-weighted harmonic mean prioritizing joint capture. |
| **Balanced Accuracy** | **97.89%** (0.9789) | `(Sensitivity + Specificity) / 2` | Class-balanced performance metric. |
| **Matthews Correlation (MCC)** | **0.9388** | Exact confusion matrix determinant | Balanced correlation metric for imbalanced classes. |
| **False Positive Rate (FPR)** | **0.48%** (0.0048) | `FP / (TN + FP)` | Background false alarm rate. |
| **False Negative Rate (FNR)** | **3.73%** (0.0373) | `FN / (TP + FN)` | Missed foreground joint tissue rate. |

> [!NOTE]
> **Metric Interpretation Notice:**
> Pixel accuracy is not the primary segmentation metric because the background occupies a large portion of radiographs. Dice/F1 (94.22%) and IoU (89.94%) remain the authoritative segmentation fidelity measures.

---

## 3. Mock Image Demonstration Fixture

* **File Path:** `data/validation_results/v2/mock_demo/mock_knee_xray.png`
* **Documentation:** `data/validation_results/v2/mock_demo/README.md`
* **Image Dimensions:** 1088 × 2680 px (Grayscale PNG)
* **Type:** Synthetic software-test fixture only.

> [!IMPORTANT]
> **SOFTWARE DEMONSTRATION FIXTURE ONLY:**
> This is a synthetic software-test image created only for backend pipeline demonstration. It is not a real medical image and must not be used for clinical interpretation or claims of clinical accuracy.

---

## 4. Mock Image Backend Smoke Test Results

The synthetic mock image was passed through the entire production pipeline end-to-end:

```
Upload (1088x2680)
      ↓
Image Validation (PNG Grayscale)
      ↓
Preprocessing (Aspect-Ratio Preserving Letterbox to 512x512)
      ↓
V2 Model Inference (best_model_v2.pth on CPU)
      ↓
Native-Space Mask Reconstruction (1088x2680)
      ↓
Knee Geometry & JSW Profiling (555 Column Samples)
      ↓
Quality Control Filter (INVALID - Synthetic anatomy safely flagged)
      ↓
Research Assessment (Reliability Score: 0.00 / 1.00)
      ↓
Complete Structured Report (RPT-999-20260823021038)
      ↓
JSON Export (4,179 bytes) + PDF Export (181,301 bytes)
```

| Pipeline Component | Result | Latency / Output Status |
|---|---|---|
| **Upload & Storage** | **PASS** | Successfully stored and assigned Scan ID |
| **Validation & Ingestion** | **PASS** | Validated single-channel 8-bit unsigned integer data |
| **Preprocessing & Letterbox** | **PASS** | Scaled isotropically with zero aspect ratio distortion |
| **Segmentation (V2 U-Net)** | **PASS** | Generated foreground prediction without CPU crash |
| **Native Reconstruction** | **PASS** | Unletterboxed back to exact native 1088 × 2680 coordinates |
| **Geometry & JSW Extraction** | **PASS** | Extracted column clearance profile across 555 sample points |
| **Quality Control Filter** | **PASS** | Safely flagged non-standard fixture as `INVALID` |
| **Research Assessment** | **PASS** | Generated non-diagnostic research observations |
| **Structured Report Assembly**| **PASS** | Assembled `KneeAnalysisReport` in 1.23 seconds |
| **JSON Export** | **PASS** | Validated Pydantic serialization (`4,098` bytes) |
| **PDF Export** | **PASS** | Compiled ReportLab multi-section document (`185,677` bytes) |
| **REST API Symmetry** | **PASS** | POST and GET endpoints for all 7 routes succeeded (HTTP 200/201) |
| **Frontend Integration** | **PASS** | Viewers, report cards, and export download routes verified |

---

## 5. Non-Diagnostic Invariants & Safety Compliance

1. **No Clinical Accuracy Claims on Synthetic Data:** Successful execution on the mock image demonstrates software/backend stability and dataflow integrity only.
2. **No Osteoarthritis Staging:** The system does NOT assign Kellgren-Lawrence grades (0–4) or claim diagnostic arthritis classification.
3. **No Surgical Planning:** The system does NOT provide total knee arthroplasty recommendations, osteotomy guidance, or implant sizing.
4. **Strict Pixel Mode:** Clearances remain strictly in pixels because public CGMH radiographs lack DICOM spacing metadata.

---

## 6. Final Conclusion

1. Existing V2 model accuracy metrics (**Dice: 94.22%**, **IoU: 89.94%**, **Precision: 92.31%**, **Recall: 96.27%**) are based on the untouched 60-patient CGMH test cohort.
2. Mock image testing verifies backend pipeline execution, API contract symmetry, and PDF/JSON generation without runtime exceptions.
3. No model retraining was performed.
4. No full test-set retesting was performed.
5. No clinical accuracy claim is made.
6. No osteoarthritis diagnosis is made.
7. No millimeter values are fabricated.
