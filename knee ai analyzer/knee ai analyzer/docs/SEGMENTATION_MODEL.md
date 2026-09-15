# KneeAI Segmentation Model Architecture & Dataset Specification

> **Clinical & Development Note:** *Training cannot be completed until the actual labelled dataset and corresponding annotations are available. This document details the software architecture, expected tensor formats, training requirements, and deployment protocols for the KneeAI segmentation pipeline.*

---

## 1. Overview & Objective

The KneeAI AI Segmentation Module is designed to delineate three critical anatomical knee structures from preprocessed knee MRI/radiographic volumes:
1. **Femur** (Distal Femoral Bone & Cartilage)
2. **Tibia** (Proximal Tibial Plateau & Bone)
3. **Meniscus** (Medial & Lateral Meniscal Cartilaginous fibrocartilage)

The resulting binary and multi-label spatial masks feed directly into the downstream **Anatomical Measurement Engine** (Joint Space Width, Condylar Ratios, Axis Alignment) and **Patient-Specific Implant Matching Engine**.

---

## 2. Model Architecture Selection

* **Framework:** MONAI (Medical Open Network for AI) + PyTorch
* **Primary Architecture:** **MONAI 3D U-Net** (`monai.networks.nets.UNet`)
  * **Input Channels:** 1 (intensity-normalized MRI / CT volume)
  * **Output Channels:** 4 classes (Background=0, Femur=1, Tibia=2, Meniscus=3)
  * **Spatial Dimensions:** 3D volumetric convolutions (`spatial_dims=3`) or 2D slice-wise (`spatial_dims=2`)
  * **Feature Channels:** `(16, 32, 64, 128, 256)`
  * **Strides:** `(2, 2, 2, 2)` with residual skip connections (`num_res_units=2`)
  * **Normalization:** Batch Normalization / Instance Normalization
  * **Activation:** PReLU / LeakyReLU

### Why MONAI + 3D U-Net?
* **Spatial Continuity:** Knee cartilage and bone boundaries require 3D spatial voxel context across sagittal, coronal, and axial planes to resolve thin meniscal structures.
* **Medical Specialization:** MONAI provides medical-native loss functions (DiceCELoss), sliding-window volumetric inference, and affine coordinate preservation.

---

## 3. Class Mapping & Annotation Schema

> **Important:** The class index mapping in `app/services/segmentation/config.py` must strictly match the label indices produced during dataset annotation.

| Class Index | Structure Name | Description |
| :--- | :--- | :--- |
| **`0`** | `background` | Non-joint tissue, background, adipose, air |
| **`1`** | `femur` | Distal femur bone and articular cartilage |
| **`2`** | `tibia` | Proximal tibia bone and plateau |
| **`3`** | `meniscus` | Medial and lateral menisci fibrocartilage |

---

## 4. Expected Dataset Structure

When integrating datasets (e.g. OAI, SKI10, or CGMH KneeSeg), organize files as follows:

```text
dataset/
├── imagesTr/
│   ├── knee_001_0000.nii.gz
│   ├── knee_002_0000.nii.gz
│   └── ...
├── labelsTr/
│   ├── knee_001.nii.gz
│   ├── knee_002.nii.gz
│   └── ...
├── imagesTs/
│   ├── knee_101_0000.nii.gz
│   └── ...
└── dataset.json
```

### Format Specifications:
* **Image Format:** NIfTI 3D (`.nii.gz`) or standardized DICOM series.
* **Mask Format:** Single multi-label integer mask NIfTI (`.nii.gz`) with voxel values $\in \{0, 1, 2, 3\}$.
* **Spatial Orientation:** Standardized canonical **RAS+** (Right-Anterior-Superior).
* **Voxel Spacing:** Resampled to isotropic $1.0 \times 1.0 \times 1.0$ mm or native resolution $[0.5, 0.5, 1.0]$ mm.

---

## 5. Preprocessing Protocol Prior to Training/Inference

Before passing scans to the segmentation network:
1. **Validation:** Check numerical finiteness (no NaNs/Infs) and signal variance.
2. **Reorientation:** Standardize spatial coordinates to RAS+.
3. **Intensity Normalization:** Apply Percentile Clipping (0.5% – 99.5%) followed by Min-Max rescaling to $[0.0, 1.0]$.
4. **Resampling:** Uniform spacing interpolation to target resolution.

---

## 6. Training Specifications

* **Loss Function:** `monai.losses.DiceCELoss(to_onehot_y=True, softmax=True)`
* **Optimizer:** AdamW (`lr=1e-4`, `weight_decay=1e-5`)
* **LR Scheduler:** CosineAnnealingLR
* **Data Augmentation:** Random 3D affine transforms, Gaussian noise, intensity scaling, and random elastic deformations.
* **Evaluation Metrics:** Mean Dice Similarity Coefficient (DSC) and 95% Hausdorff Distance ($HD_{95}$) per compartment:
  * Femur DSC Target: $> 0.96$
  * Tibia DSC Target: $> 0.95$
  * Meniscus DSC Target: $> 0.85$

---

## 7. Model Weight Storage & Deployment

* **Weight Directory:** `model_weights/`
* **Artifact Naming:** `model_weights/knee_unet_3d_best.pth`
* **Configuration:** Set `SEGMENTATION_WEIGHTS_FILE="knee_unet_3d_best.pth"` in `.env`.
* **State Reporting:**
  * When weights are present: `POST /scans/{id}/segment` executes inference and saves masks into `data/results/`.
  * When weights are absent: `POST /scans/{id}/segment` returns `status="model_unavailable"` without generating fake clinical data.

---

## 8. Post-Processing & Output Generation

1. **Logit Argmax:** Converts channel logits to multi-class index map.
2. **Mask Disentanglement:** Generates separate binary volumes:
   * `data/results/femur_mask_<uuid>.nii.gz`
   * `data/results/tibia_mask_<uuid>.nii.gz`
   * `data/results/meniscus_mask_<uuid>.nii.gz`
3. **Geometry Preservation:** Outputs inherit the exact spatial affine and voxel zoom from the preprocessed scan.
