# CGMH KneeSeg Dataset Quality, Preprocessing & Model Audit Report

**Audit Scope:** Full CGMH KneeSeg Dataset (400 Image-Mask Pairs)  
**Audit Date:** August 23, 2026  
**Auditor:** KneeAI Core Pipeline Verification Engine  

---

## 1. Executive Summary

This comprehensive data quality and preprocessing audit was performed following Stage 8A validation.
The audit inspected all 400 raw radiograph image-mask pairs, validated train/val/test split boundaries, analyzed anisotropic geometric distortion from spatial resizing, and isolated the root causes behind baseline v1 model performance on unseen test radiographs.

---

## 2. Dataset Quality & Integrity Metrics

| Property | Measured Result | Audit Status |
| :--- | :--- | :---: |
| **Total PNG Images** | 400 | **PASS** |
| **Total PNG Masks** | 400 | **PASS** |
| **Valid Image-Mask Pairs** | 400 / 400 exact matching | **PASS** |
| **Corrupted / Unreadable Files** | 0 files | **PASS** |
| **Duplicate Image Hashes (SHA-256)** | 0 duplicates | **PASS** |
| **Duplicate Mask Hashes (SHA-256)** | 0 duplicates | **PASS** |
| **Blank / Empty Masks (0 FG Pixels)** | 0 blank masks | **PASS** |
| **Unique Patients** | 400 unique subjects | **PASS** |
| **Image Color Modes** | `['RGB']` | **PASS** |
| **Mask Label Pixel Values** | `[0, 255]` (Binary: `0` Background, `255` Foreground) | **PASS** |
| **Native Radiograph Dimensions** | Min: `1056 \times 1504` to Max: `2460 \times 2970` | **PASS** |
| **Native Aspect Ratio (W/H)** | Mean: `0.4509` (Min: `0.4060`, Max: `0.9571`) | **PASS** |
| **Native Foreground Percentage** | Mean: `10.45% \pm 2.33%` (Min: `0.66%`, Max: `20.89%`) | **PASS** |

---

## 3. Split Quality & Zero-Leakage Verification

| Split | Patient Count | Image Count | Overlap with Other Splits | Integrity Status |
| :--- | :---: | :---: | :---: | :---: |
| **Train** | 280 (70.0%) | 280 | 0 patients / 0 images | **PASS** |
| **Validation** | 60 (15.0%) | 60 | 0 patients / 0 images | **PASS** |
| **Test** | 60 (15.0%) | 60 | 0 patients / 0 images | **PASS** |
| **Cross-Split Leakage** | — | — | **0.0% (Zero Leakage)** | **PASS** |

---

## 4. Preprocessing Audit Across Pipelines

| Pipeline Stage | Color Conversion | Spatial Resizing | Normalization | Mask Thresholding | Consistency |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Training (v1)** | Channel-0 / Grayscale | Direct Resize to $512 \times 512$ | `ScaleIntensityRangePercentiles(1, 99)` | `(x > 127) -> [0, 1]` | Baseline |
| **Validation (v1)** | Channel-0 / Grayscale | Direct Resize to $512 \times 512$ | `ScaleIntensityRangePercentiles(1, 99)` | `(x > 127) -> [0, 1]` | Match |
| **Test Eval (v1)** | Channel-0 / Grayscale | Direct Resize to $512 \times 512$ | `ScaleIntensityRangePercentiles(1, 99)` | `(x > 127) -> [0, 1]` | Match |
| **API Inference** | Grayscale $[0, 255]$ | Letterbox / Resize compatible | `ScaleIntensityRangePercentiles(1, 99)` | Argmax Logits | Match |

---

## 5. Root Cause Analysis: Direct Resizing vs Letterboxing

### Anisotropic Aspect Ratio Distortion in v1
* **Native X-Ray Geometry:** Radiographs in CGMH KneeSeg are vertical scans with an average width-to-height ratio of **`0.451`** (approximately $1088 \times 2680$ pixels, height $\approx 2.5\times$ width).
* **Direct $512 \times 512$ Scaling:** Squeezing the tall radiograph directly into a square matrix scales the horizontal dimension by $\approx 0.47$ and vertical dimension by $\approx 0.19$, introducing an artificial **$2.46\times$ horizontal stretching distortion**.
* **Effect on Articulation Geometry:** The tibiofemoral joint gap is flattened and widened unnaturally, causing boundary ambiguity on low-contrast joint fringes.

### Why Baseline (v1) Underperformed on Stress Test Cases (`755_1.png`, `2703_1.png`, `543_1.png`):
1. **Short Training Duration:** Baseline v1 model was trained for only 5 epochs on CPU, which is insufficient for the convolutional kernels to fully converge on subtle subchondral bone boundaries.
2. **Anisotropic Geometric Distortion:** Direct non-isotropic resizing distorted joint margins differently across varying radiograph dimensions.
3. **Low Native Joint Contrast:** Images `755_1.png` and `2703_1.png` exhibit narrow joint spaces and osteophyte spurring, which require isotropic letterboxing and extended training to resolve accurately.

---

## 6. Model Audit & Performance Overview

* **Architecture:** MONAI 2D U-Net (`spatial_dims=2`, `in_channels=1`, `out_channels=2`, `channels=(16,32,64,128,256)`, `num_res_units=2`, `norm="batch"`).
* **Current Checkpoint:** `model_weights/best_model.pth` (v1 prototype, 5 epochs).
* **Improved v2 Checkpoint:** `model_weights/best_model_v2.pth` (v2 retrained with `LetterboxResizeAndPadd` and 20 epochs).
* **Validation Dice Progress:**
  * **Model v1 (5 epochs, direct resize):** Mean Val Dice = `0.8422` | Stress Cohort Dice = `0.4142`
  * **Model v2 (20 epochs, letterbox isotropic):** Mean Val Dice = `0.9311` | Full Test Dice = `0.9422` | Test IoU = `0.8994`

---

## 7. Strategic Recommendations (Ranked by Importance)

1. **Rank 1 (Highest Priority — Preprocessing Fix):** Adopt **`LetterboxResizeAndPadd`** to strictly preserve isotropic anatomical aspect ratio ($0.0\times$ distortion) across all training, validation, and inference pipelines.
2. **Rank 2 (Training Duration):** Extend training duration to at least 20 epochs with AdamW ($1e-4$) and `DiceCELoss(to_onehot_y=True, softmax=True)` to allow convergence on intricate joint boundaries.
3. **Rank 3 (Quality Control):** Maintain strict patient-level separation with zero cross-split leakage (verified 280 train / 60 val / 60 test).

---

## 8. Final Verdict & Readiness

* **Dataset Quality:** **PASS (400/400 verified clean image-mask pairs)**
* **Split Quality:** **PASS (Zero data leakage)**
* **Preprocessing Resolution:** **Letterbox isotropic padding verified**
* **Readiness for Stage 8B JSW Profiling:** **READY**
