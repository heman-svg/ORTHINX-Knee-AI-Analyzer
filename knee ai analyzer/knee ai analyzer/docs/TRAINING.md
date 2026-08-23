# KneeAI Segmentation Model Training & Dataset Integration Guide

This guide details the complete protocol for integrating labeled knee datasets, executing reproducible 3D U-Net training, calculating compartment metrics, and deploying trained weights to the KneeAI inference backend.

---

## 1. Dataset Directory Organization

Place labeled volumetric MRI or CT knee datasets into `data/dataset/` adhering to the following structure:

```text
data/dataset/
├── images/
│   ├── case001_image.nii.gz
│   ├── case002_image.nii.gz
│   └── ...
└── labels/
    ├── case001_mask.nii.gz
    ├── case002_mask.nii.gz
    └── ...
```

---

## 2. Label Mapping Protocol

KneeAI expects multi-class integer masks with indices mapped as follows:

| Class Index | Structure | Description |
| :--- | :--- | :--- |
| **`0`** | `background` | Non-joint tissue, background, air |
| **`1`** | `femur` | Distal femur bone and articular cartilage |
| **`2`** | `tibia` | Proximal tibia bone and plateau |
| **`3`** | `meniscus` | Medial and lateral menisci fibrocartilage |

---

## 3. Patient-Level Splitting

To prevent spatial data leakage across neighboring slices/volumes from the same subject, splits are strictly computed at the **Patient ID level**:
* **Training Set:** 70%
* **Validation Set:** 15% (used for best checkpoint selection)
* **Test Set:** 15% (untouched, reserved for final evaluation)

Split manifests are saved deterministically to `data/splits/train.csv`, `val.csv`, and `test.csv`.

---

## 4. Preprocessing & Augmentation Pipeline

Training transforms apply:
1. **`LoadImaged` & `EnsureChannelFirstd`**
2. **`Orientationd(axcodes="RAS")`** (Standardizes anatomical coordinates)
3. **`Spacingd(pixdim=(1.0, 1.0, 1.0), mode=("bilinear", "nearest"))`**
4. **`NormalizeIntensityd(nonzero=True)`**
5. **`RandCropByPosNegLabeld(spatial_size=(96, 96, 32), pos=2, neg=1)`** (Class-balanced patch sampling)
6. **`RandAffined` & `RandGaussianNoised`** (Geometric & intensity augmentations)

---

## 5. Model Architecture & Loss Function

* **Network:** MONAI 3D U-Net (`monai.networks.nets.UNet`) with 4 output channels and residual skip connections.
* **Loss Function:** `DiceCELoss(to_onehot_y=True, softmax=True)`
  * Combines Soft Dice Loss (mitigating foreground/background imbalance) with Cross-Entropy Loss (providing smooth gradient landscape).
* **Optimizer:** AdamW (`lr=1e-4`, `weight_decay=1e-5`).

---

## 6. Training Execution

To run training:

```bash
python scripts/train_segmentation.py --data-dir data/dataset --epochs 50 --batch-size 2
```

---

## 7. Model Evaluation & Checkpoints

Checkpoints are stored in `model_weights/`:
* `model_weights/best_model.pth` — Checkpoint achieving highest validation mean Dice.
* `model_weights/latest_model.pth` — Most recent epoch state for training resumption (`--resume`).
* `model_weights/training_history.json` — Epoch-by-epoch loss, Dice, and IoU records.

To evaluate the best checkpoint on the test split:

```bash
python scripts/evaluate_segmentation.py --model-path model_weights/best_model.pth
```

---

## 8. Connecting Trained Weights to the Backend (Step 5)

Once `best_model.pth` is generated:
1. Ensure the file is located at `model_weights/best_model.pth`.
2. Update `.env`:
   ```ini
   SEGMENTATION_WEIGHTS_FILE="best_model.pth"
   ```
3. Restart or reload the FastAPI backend:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Triggering `POST /scans/{scan_id}/segment` will automatically load the trained weights and produce real anatomical masks in `data/results/`.
