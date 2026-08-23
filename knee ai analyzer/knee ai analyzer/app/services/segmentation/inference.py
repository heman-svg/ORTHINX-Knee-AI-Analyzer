import json
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
import numpy as np
import torch
from sqlalchemy.orm import Session
from PIL import Image

try:
    import nibabel as nib
except ImportError:
    nib = None

from app.core.config import settings
from app.models.scan import Scan
from app.services.preprocessing.loader import load_medical_image
from app.services.segmentation.model import SegmentationModel
from app.services.segmentation.postprocessing import postprocess_logits
from app.services.segmentation.config import SegmentationConfig
from app.services.training.visualization import create_overlay_image

# Global default segmentation model instance
default_segmentation_model = SegmentationModel(
    config=SegmentationConfig(
        weights_path=Path(settings.MODEL_DIR / settings.SEGMENTATION_WEIGHTS_FILE)
        if settings.SEGMENTATION_WEIGHTS_FILE and (settings.MODEL_DIR / settings.SEGMENTATION_WEIGHTS_FILE).exists()
        else None,
        device=settings.DEVICE,
    )
)


def calculate_anatomical_measurements(mask_2d: np.ndarray, probs_2d: Optional[np.ndarray] = None) -> Dict[str, Any]:
    """
    Calculate non-fabricated geometric and anatomical metrics from the predicted mask.
    """
    h, w = mask_2d.shape
    total_pixels = h * w
    fg_pixels = int(np.sum(mask_2d > 0))
    
    if fg_pixels == 0:
        return {
            "foreground_pixels": 0,
            "total_pixels": total_pixels,
            "area_percentage": 0.0,
            "mean_confidence": 0.0,
            "bounding_box": None,
            "joint_space_clearance_px": None,
            "status": "no_foreground_detected",
        }

    area_pct = round(float((fg_pixels / total_pixels) * 100.0), 2)
    
    # Bounding box
    rows = np.any(mask_2d > 0, axis=1)
    cols = np.any(mask_2d > 0, axis=0)
    ymin, ymax = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    xmin, xmax = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
    bbox = [xmin, ymin, xmax, ymax]
    bbox_width = xmax - xmin + 1
    bbox_height = ymax - ymin + 1

    # Confidence score
    mean_conf = 1.0
    if probs_2d is not None and probs_2d.ndim >= 2:
        fg_probs = probs_2d[mask_2d > 0]
        mean_conf = round(float(np.mean(fg_probs)), 4)

    # Vertical clearance / joint height profile across horizontal columns
    column_heights = []
    for c in range(xmin, xmax + 1):
        col_mask = mask_2d[:, c]
        if np.any(col_mask > 0):
            col_fg_indices = np.where(col_mask > 0)[0]
            col_height = int(col_fg_indices[-1] - col_fg_indices[0] + 1)
            column_heights.append(col_height)

    median_joint_height = float(np.median(column_heights)) if column_heights else 0.0

    return {
        "foreground_pixels": fg_pixels,
        "total_pixels": total_pixels,
        "area_percentage": area_pct,
        "mean_confidence": mean_conf,
        "bounding_box": {
            "x_min": xmin,
            "y_min": ymin,
            "x_max": xmax,
            "y_max": ymax,
            "width": bbox_width,
            "height": bbox_height,
        },
        "joint_height_median_px": round(median_joint_height, 1),
        "status": "analyzed",
    }


def run_segmentation(
    db: Session,
    scan_id: int,
    model: Optional[SegmentationModel] = None,
    filter_components: bool = False,
) -> Dict[str, Any]:
    """
    Orchestrates segmentation and anatomical measurement extraction on a medical scan.
    """
    seg_model = model or default_segmentation_model

    # Ensure model weights are loaded if best_model.pth exists
    if not seg_model.is_available():
        weights_file = settings.MODEL_DIR / (settings.SEGMENTATION_WEIGHTS_FILE or "best_model.pth")
        if weights_file.exists():
            seg_model.load_weights(weights_file)

    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise LookupError(f"Scan with ID {scan_id} does not exist.")

    # Validate that the scan has been preprocessed
    if not scan.preprocessed_path or not Path(scan.preprocessed_path).exists():
        raise ValueError("Scan must be preprocessed before segmentation.")

    # Load preprocessed image to check dimensionality
    img_data = load_medical_image(scan.preprocessed_path)
    raw_array = img_data.data.astype(np.float32)
    is_3d = raw_array.ndim >= 3

    # Check model compatibility
    if not seg_model.is_available():
        scan.segmentation_status = "model_unavailable"
        db.commit()
        db.refresh(scan)
        return {
            "scan_id": scan.id,
            "status": "model_unavailable",
            "model_available": False,
            "message": "Segmentation model weights are not available.",
            "structures": list(seg_model.config.class_mapping.values())[1:],
            "femur_mask_path": None,
            "tibia_mask_path": None,
            "meniscus_mask_path": None,
            "knee_joint_mask_path": None,
            "overlay_path": None,
            "measurements": None,
        }

    # If scan is 3D but loaded weights are 2D (or vice-versa), report model_unavailable gracefully
    if is_3d and seg_model.spatial_dims != 3:
        scan.segmentation_status = "model_unavailable"
        db.commit()
        db.refresh(scan)
        return {
            "scan_id": scan.id,
            "status": "model_unavailable",
            "model_available": False,
            "message": "3D volumetric model weights are not available. Current trained model is 2D radiograph U-Net.",
            "structures": ["femur", "tibia", "meniscus"],
            "femur_mask_path": None,
            "tibia_mask_path": None,
            "meniscus_mask_path": None,
            "knee_joint_mask_path": None,
            "overlay_path": None,
            "measurements": None,
        }

    results_dir = settings.RESULTS_DIR
    results_dir.mkdir(parents=True, exist_ok=True)
    unique_token = uuid.uuid4().hex

    t_start = time.time()

    if not is_3d:
        # Preprocessing matching training: Grayscale single-channel, Aspect-Ratio-Preserved Letterbox to (512, 512), Percentile [0, 1]
        from app.services.training.monai_dataset import letterbox_image_array, unletterbox_mask_array

        u8_arr = raw_array.astype(np.uint8) if raw_array.max() > 1.0 else (raw_array * 255).astype(np.uint8)
        if u8_arr.ndim == 3 and u8_arr.shape[2] == 3:
            u8_arr = u8_arr[:, :, 0]  # Take channel-0 matching training
        elif u8_arr.ndim == 3 and u8_arr.shape[0] == 3:
            u8_arr = u8_arr[0, :, :]

        padded_arr, letterbox_meta = letterbox_image_array(u8_arr, spatial_size=(512, 512), is_mask=False)
        norm_arr = padded_arr.astype(np.float32)
        
        # Intensity range percentiles (1, 99)
        p1, p99 = np.percentile(norm_arr, 1), np.percentile(norm_arr, 99)
        if p99 > p1:
            norm_arr = np.clip((norm_arr - p1) / (p99 - p1), 0.0, 1.0)
        else:
            norm_arr = norm_arr / 255.0

        # Tensor shape: (1, 1, 512, 512)
        tensor = torch.from_numpy(norm_arr).unsqueeze(0).unsqueeze(0)

        # Forward pass
        logits = seg_model.predict(tensor)
        probs = torch.softmax(logits, dim=1)
        pred_classes = torch.argmax(logits, dim=1)[0].cpu().numpy().astype(np.uint8)
        joint_probs = probs[0, 1].cpu().numpy()

        # Unletterbox mask back to native original image dimensions
        native_mask = unletterbox_mask_array(pred_classes, letterbox_meta)

        # Compute anatomical measurements
        measurements = calculate_anatomical_measurements(pred_classes, probs_2d=joint_probs)
        measurements["letterbox_meta"] = {
            "scale": letterbox_meta["scale"],
            "pad_x": letterbox_meta["pad_x"],
            "pad_y": letterbox_meta["pad_y"],
            "native_shape": [letterbox_meta["orig_h"], letterbox_meta["orig_w"]],
        }

        # Save 512x512 binary mask
        mask_filename = f"knee_joint_mask_{unique_token}.png"
        mask_dest = results_dir / mask_filename
        Image.fromarray((pred_classes * 255).astype(np.uint8)).save(str(mask_dest))

        # Save native-dimension binary mask
        native_mask_filename = f"knee_joint_mask_native_{unique_token}.png"
        native_mask_dest = results_dir / native_mask_filename
        Image.fromarray((native_mask * 255).astype(np.uint8)).save(str(native_mask_dest))

        # Save visual overlay on letterboxed image
        overlay_filename = f"overlay_{unique_token}.png"
        overlay_dest = results_dir / overlay_filename
        overlay_pil = create_overlay_image((norm_arr * 255).astype(np.uint8), pred_classes, alpha=0.45)
        overlay_pil.save(str(overlay_dest))

        # Database update
        scan.femur_mask_path = None
        scan.tibia_mask_path = None
        scan.meniscus_mask_path = None
        scan.segmentation_status = "completed"
        db.commit()
        db.refresh(scan)

        inference_time_ms = round((time.time() - t_start) * 1000, 1)

        return {
            "scan_id": scan.id,
            "status": "completed",
            "model_available": True,
            "message": "2D Knee Joint segmentation and assessment completed successfully.",
            "structures": ["knee_joint"],
            "knee_joint_mask_path": str(mask_dest.resolve()),
            "native_mask_path": str(native_mask_dest.resolve()),
            "overlay_path": str(overlay_dest.resolve()),
            "mask_relative_url": f"/results/{mask_filename}",
            "native_mask_relative_url": f"/results/{native_mask_filename}",
            "overlay_relative_url": f"/results/{overlay_filename}",
            "measurements": measurements,
            "inference_time_ms": inference_time_ms,
            "device": str(seg_model.device),
        }

    else:
        # 3D MRI Volumetric Pipeline
        tensor = torch.from_numpy(raw_array).unsqueeze(0).unsqueeze(0)
        logits = seg_model.predict(tensor)

        masks = postprocess_logits(
            logits,
            class_mapping=seg_model.config.class_mapping,
            filter_components=filter_components,
        )

        saved_paths: Dict[str, str] = {}
        for structure in ["femur", "tibia", "meniscus"]:
            mask_arr = masks.get(structure)
            if mask_arr is None:
                continue

            mask_filename = f"{structure}_mask_{unique_token}.nii.gz"
            dest_path = results_dir / mask_filename
            affine = img_data.affine if img_data.affine is not None else np.eye(4)
            if nib is not None:
                nii_mask = nib.Nifti1Image(mask_arr.astype(np.uint8), affine)
                nib.save(nii_mask, str(dest_path))
            else:
                dest_path = results_dir / f"{structure}_mask_{unique_token}.npy"
                np.save(str(dest_path), mask_arr.astype(np.uint8))

            saved_paths[structure] = str(dest_path.resolve())

        scan.femur_mask_path = saved_paths.get("femur")
        scan.tibia_mask_path = saved_paths.get("tibia")
        scan.meniscus_mask_path = saved_paths.get("meniscus")
        scan.segmentation_status = "completed"
        db.commit()
        db.refresh(scan)

        return {
            "scan_id": scan.id,
            "status": "completed",
            "model_available": True,
            "message": "3D Knee MRI segmentation completed successfully.",
            "structures": ["femur", "tibia", "meniscus"],
            "femur_mask_path": scan.femur_mask_path,
            "tibia_mask_path": scan.tibia_mask_path,
            "meniscus_mask_path": scan.meniscus_mask_path,
            "knee_joint_mask_path": None,
            "overlay_path": None,
            "measurements": {"structures_detected": list(saved_paths.keys())},
        }
