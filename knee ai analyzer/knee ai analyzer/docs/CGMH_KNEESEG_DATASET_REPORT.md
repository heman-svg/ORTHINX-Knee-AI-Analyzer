# CGMH KneeSeg Dataset Integration & Physical Inspection Report

---

## 1. Dataset Overview & Physical Location

* **Dataset Name:** CGMH KneeSeg (Chang Gung Memorial Hospital Knee Segmentation)
* **Dataset Source URL:** [https://www.kaggle.com/datasets/tommyngx/cgmh-kneeseg](https://www.kaggle.com/datasets/tommyngx/cgmh-kneeseg)
* **Physical Local Path:** `C:\Users\heman\Downloads\archive\CGMH_KneeSegment`
* **Configured Setting:** `CGMH_DATASET_ROOT = "C:\\Users\\heman\\Downloads\\archive\\CGMH_KneeSegment"`
* **Physical Inspection Status:** **VERIFIED & INTEGRATED (100% Valid Pairs)**

---

## 2. Directory Structure & Layout

The dataset on disk contains two synchronized subdirectories:

```text
C:\Users\heman\Downloads\archive\CGMH_KneeSegment\
├── Image/             # 400 Grayscale / RGB PNG Radiograph files (e.g. 1013_0.png, 79_1.png)
└── Label/             # 400 Single-Channel 8-bit PNG Mask files with identical names
```

---

## 3. Dataset Characteristics & Physical Metrics

| Metric | Inspected Value |
| :--- | :--- |
| **Total Images** | **400** |
| **Total Masks** | **400** |
| **Valid Image-Mask Pairs** | **400 (100% exact filename match)** |
| **Unmatched Images / Masks** | **0** |
| **Corrupted Files** | **0** |
| **Total Unique Patients / Cases** | **400** |
| **Image Format** | 2D PNG Radiographs (RGB mode, high dynamic range) |
| **Mask Format** | 2D PNG Binary Integer Masks (L mode, uint8) |
| **Spatial Dimensions ($W \times H$)** | $1056 \times 2576$ up to $2460 \times 2970$ pixels |
| **Voxel Spacing** | Native 2D pixel coordinates (1:1 aspect ratio) |
| **Unique Label Values** | `[0, 255]` |

---

## 4. Actual Anatomical Label Mapping

| Label Value | Raw Pixel Value | Anatomical Structure | Clinical Purpose in KneeAI |
| :---: | :---: | :--- | :--- |
| **`0`** | `0` | `background` | Non-joint tissue, soft tissue, and background |
| **`1`** | `255` | `knee_joint` | Femoral-tibial articular joint space & ROI |

---

## 5. Patient-Level Splitting

Deterministic patient-level splits generated in `data/splits/` with fixed seed (`seed=42`):

| Split | Count | Ratio | Manifest File |
| :--- | :---: | :---: | :--- |
| **Train** | **280** | **70.0%** | `data/splits/train.csv` |
| **Validation** | **60** | **15.0%** | `data/splits/val.csv` |
| **Test** | **60** | **15.0%** | `data/splits/test.csv` |

---

## 6. Model Compatibility Analysis

* **Dimensionality:** CGMH KneeSeg consists of high-resolution 2D planar radiographs ($W \times H$).
* **MONAI Architecture:**
  * For 2D radiograph training: `monai.networks.nets.UNet(spatial_dims=2, in_channels=1, out_channels=2)` (Binary segmentation).
  * For 3D volumetric MRI scans: `monai.networks.nets.UNet(spatial_dims=3, in_channels=1, out_channels=4)` (Multi-class femur/tibia/meniscus segmentation).
* Both configurations are natively supported without modifying the underlying inference pipeline.
