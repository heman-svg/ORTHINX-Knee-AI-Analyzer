# Preprocessing & Training/Inference Consistency Audit

**Audit Date:** August 23, 2026  
**Auditor:** KneeAI Core Pipeline Verification Engine  

---

## 1. Pipeline Verification Matrix

| Component | Training Pipeline (`monai_dataset.py`) | Test Evaluation (`trainer.py`) | API Inference (`inference.py`) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Image Loading** | `LoadImaged(keys=["image"])` | `LoadImaged(keys=["image"])` | `Image.open() / load_medical_image()` | **MATCH** |
| **Grayscale Conversion** | Single-channel enforcement (`Lambdad`) | Single-channel enforcement (`Lambdad`) | `convert("L")` | **MATCH** |
| **Spatial Resizing** | `Resized(spatial_size=(512, 512))` | `Resized(spatial_size=(512, 512))` | `resize((512, 512), BILINEAR)` | **MATCH** |
| **Image Interpolation** | Bilinear (`mode="bilinear"`) | Bilinear (`mode="bilinear"`) | Bilinear (`Image.Resampling.BILINEAR`) | **MATCH** |
| **Mask Interpolation** | Nearest-Neighbor (`mode="nearest"`) | Nearest-Neighbor (`mode="nearest"`) | Nearest-Neighbor (`Image.Resampling.NEAREST`) | **MATCH** |
| **Intensity Scaling** | `ScaleIntensityRangePercentilesd(1, 99)` | `ScaleIntensityRangePercentilesd(1, 99)` | `np.percentile(arr, 1), np.percentile(arr, 99)` | **MATCH** |
| **Mask Binarization** | `(x > 127) -> [0, 1]` | `(x > 127) -> [0, 1]` | `(x > 127) -> [0, 1]` | **MATCH** |
| **Tensor Dimensions** | `(1, 1, 512, 512)` | `(1, 1, 512, 512)` | `(1, 1, 512, 512)` | **MATCH** |
| **Model Forward Pass** | MONAI 2D U-Net (2 classes) | MONAI 2D U-Net (2 classes) | MONAI 2D U-Net (2 classes) | **MATCH** |
| **Logits Output** | `(B, 2, 512, 512)` | `(B, 2, 512, 512)` | `(1, 2, 512, 512)` | **MATCH** |

---

## 2. Geometric Aspect Ratio Analysis

* **Original Radiograph Dimensions:** $1088 \times 2680$ pixels (typical)
* **Native Aspect Ratio ($W/H$):** Mean $= 0.4509$ (Range: $0.4060 - 0.9571$)
* **Model Grid Dimensions:** $512 \times 512$ (Aspect Ratio $= 1.0$)
* **Distortion Factor:** Horizontal stretching of $\approx 2.22\times$ relative to native anatomy.
* **Finding:** The model is forced to learn flattened joint shapes. While self-consistent in $512 \times 512$ space, direct non-isotropic resizing stretches the medial/lateral joint space and compresses the femoral shaft, contributing to dilated boundary predictions along superior/inferior margins.
* **Recommendation:** Incorporate isotropic letterboxing (`ResizeWithPadOrCropd` with zero-padding) in the next training iteration to preserve true physical anatomical aspect ratios.
