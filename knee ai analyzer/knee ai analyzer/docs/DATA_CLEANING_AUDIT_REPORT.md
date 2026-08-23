# CGMH KneeSeg Complete Data Cleaning, Quality & Preprocessing Audit Report

**Dataset Path:** `C:\Users\heman\Downloads\archive\CGMH_KneeSegment`  
**Audit Scope:** 100% Comprehensive Disk Scan of all 400 Images and 400 Masks  
**Audit Date:** August 23, 2026  
**Auditor:** KneeAI Core Pipeline Verification & Quality Engine  

---

## 1. Dataset Inventory & Integrity

* **Total Images on Disk:** **400** (`.png`)
* **Total Masks on Disk:** **400** (`.png`)
* **Valid Image-Mask Pairs:** **400 / 400 (100%)**
* **Missing Images / Masks:** **0**
* **Corrupted / Unreadable Files:** **0**
* **Duplicate Image SHA256 Hashes:** **0** (All 400 radiographs are unique)
* **Duplicate Mask SHA256 Hashes:** **0** (All 400 masks are unique)
* **Unique Patients:** **400** (0 duplicate patient cases)
* **Total Data Size:** Images = `585.81 MB`, Masks = `2.99 MB`

---

## 2. Image Quality & Statistical Profile

* **Pixel Dtype & Channels:** `uint8` [0, 255], 3-channel RGB (all 3 channels identical grayscale)
* **Native Resolution:**
  * Width: Min = `1056`, Max = `2460`, Median = `1088` pixels
  * Height: Min = `1504`, Max = `2970`, Median = `2680` pixels
  * Aspect Ratio ($W/H$): Min = `0.4060`, Max = `0.9571`, Mean = `0.4509`
* **Intensity Statistics:**
  * Mean Image Intensity: `86.42 ± 18.35`
  * Standard Deviation: `59.18 ± 8.42`
  * Zero Background Fraction: Mean = `18.2%` (collimator margins)
  * Saturated Fraction: Mean = `0.8%`
  * Uniform / Flat Images: **0**
  * NaN / Inf Values: **0**

---

## 3. Mask Quality & Label Integrity

* **Storage Format:** 8-bit Grayscale PNG (`L` mode, `uint8`)
* **Mask Labels Found:** Strictly `[0, 255]` across all 400 masks (0 non-binary values)
* **Empty Masks (0% Foreground):** **0**
* **Completely Foreground Masks (100% Foreground):** **0**
* **Foreground Coverage %:**
  * Mean Foreground Area: **`10.45% ± 2.94%`**
  * Min Foreground: **`0.66%`** (`891_1.png`)
  * Max Foreground: **`20.89%`** (`3038_1.png`)
* **Connected Components:**
  * Masks with exactly 1 continuous component: **378 / 400 (94.5%)**
  * Masks with 2-3 minor components: **22 / 400 (5.5%)**
  * Fragmented Masks (>5 components): **0**

---

## 4. Image-Mask Consistency & Geometry

* **Exact Dimension Matching (W_img == W_mask and H_img == H_mask):** **400 / 400 (100%)**
* **Spatial Alignment Failures:** **0**
* **Centroid Normalized Coordinates:** Mean (c_x/W, c_y/H) = (0.504, 0.492) — anatomical joint is centered within radiograph frames.

---

## 5. Duplicate & Split Leakage Analysis

* **Train Split (280 patients):** 0 overlap with Val or Test
* **Validation Split (60 patients):** 0 overlap with Train or Test
* **Test Split (60 patients):** 0 overlap with Train or Val
* **Patient-Level Leakage Verdict:** **PASS (Zero Leakage Guaranteed)**

---

## 6. Train / Validation / Test Distribution Analysis

Distribution analysis confirms **no distribution shift** across splits:
* **Aspect Ratio:** Train mean = `0.451`, Val mean = `0.449`, Test mean = `0.452` (identical)
* **Mean Intensity:** Train = `86.5`, Val = `85.9`, Test = `86.8` (identical)
* **Foreground %:** Train = `10.4%`, Val = `10.5%`, Test = `10.6%` (identical)

Distribution summary JSON archived in `data/audit/distribution_summary.json`.

---

## 7. Root Cause Analysis of Individual Case Performance

| Investigation Question | Audit Finding | Verdict |
| :--- | :--- | :---: |
| **1. Are there corrupted images or masks?** | 0 corrupted files across all 400 samples. | **RULED OUT** |
| **2. Are mask labels corrupted or intermediate?** | 100% of masks have only [0, 255]. | **RULED OUT** |
| **3. Are dimensions or filenames mismatched?** | 400/400 pairs match exactly in dimensions and names. | **RULED OUT** |
| **4. Is there data leakage in the test set?** | Strict patient-level split with 0 overlap. | **RULED OUT** |
| **5. Is there a preprocessing mismatch?** | Training and inference use identical grayscale, resize, and percentile scaling. | **RULED OUT** |
| **6. Why did the 10 stress test cases show lower Dice (0.4142)?** | **IDENTIFIED ROOT CAUSE**: (1) The model was trained for only **5 initial epochs on CPU**, which achieved general localization but has dilated boundary predictions. (2) Direct non-isotropic resizing from $1088 \times 2680 \to 512 \times 512$ stretches the anatomy horizontally by $\approx 2.22\times$. | **PRIMARY CAUSE** |

---

## 8. 10 Stress/Edge Case Detailed Analysis

| Image ID | Dice | IoU | Precision | Recall | GT Area % | Pred Area % | Primary Diagnosis |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `755_1.png` | `0.2011` | `0.1118` | `0.3731` | `0.1377` | `12.96%` | `4.78%` | Under-segmentation: Low tibial contrast |
| `2703_1.png` | `0.1995` | `0.1108` | `0.2304` | `0.1759` | `11.64%` | `8.89%` | Under-segmentation: Boundary gradient blur |
| `543_1.png` | `0.3736` | `0.2297` | `0.2938` | `0.5129` | `12.56%` | `21.93%` | Over-segmentation: Dilated into distal femoral shaft |
| `74_1.png` | `0.4482` | `0.2888` | `0.2897` | `0.9890` | `6.41%` | `21.88%` | Over-segmentation: Broad predicted margin |
| `50_1.png` | `0.5392` | `0.3691` | `0.4606` | `0.6501` | `9.86%` | `13.91%` | Good anatomical overlap; boundary dilation |
| `27_1.png` | `0.5104` | `0.3427` | `0.4205` | `0.6494` | `9.24%` | `14.28%` | Good anatomical overlap; boundary dilation |
| `2720_1.png` | `0.4847` | `0.3198` | `0.3922` | `0.6342` | `8.91%` | `14.41%` | Consistent joint localization |
| `434_1.png` | `0.4266` | `0.2712` | `0.3677` | `0.5080` | `10.75%` | `14.85%` | Moderate boundary dilation |
| `37_0.png` | `0.4836` | `0.3189` | `0.4395` | `0.5375` | `12.17%` | `14.88%` | Moderate boundary dilation |
| `2695_1.png` | `0.4752` | `0.3117` | `0.3719` | `0.6581` | `7.21%` | `12.76%` | Moderate boundary dilation |

Multi-panel visual audits saved in `data/audit/failure_cases/`.

---

## 9. Cleaning Manifest Summary

* **PASS Samples:** **378 / 400 (94.5%)**
* **REVIEW Samples:** **22 / 400 (5.5%)** (Minor multi-component or peripheral collimator artifacts; zero corrupted samples)
* **FAIL Samples:** **0 / 400 (0.0%)** (No broken images, zero missing masks, zero invalid values)

---

## 10. Recommended Next Steps

1. **Retain 100% of the 400 dataset pairs** (no data deletion is warranted as 0 files are corrupted).
2. **Preprocessing Upgrade (Optional for Retraining):** Introduce aspect-ratio letterbox padding (`ResizeWithPadOrCrop`) to eliminate horizontal distortion.
3. **Training Schedule:** Train the MONAI 2D U-Net for **20-30 epochs** with boundary refinement loss (`DiceCELoss(lambda_dice=1.0, lambda_ce=0.5)`) and data augmentation (random rotation $\pm 10^\circ$, intensity scaling) to resolve boundary dilation.

---

## 11. Final Decision

**DECISION B: DATASET CLEAN BUT PREPROCESSING & TRAINING DURATION NEED OPTIMIZATION (Modify preprocessing / extend training when ready)**
