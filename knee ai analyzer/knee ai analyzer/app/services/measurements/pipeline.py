"""
Pipeline orchestrator for Stage 9 Native-Space Knee Joint Measurement and Assessment.
"""

import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from PIL import Image
import torch
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.scan import Scan
from app.services.preprocessing.loader import load_medical_image
from app.services.segmentation.model import SegmentationModel
from app.services.segmentation.config import SegmentationConfig
from app.services.training.monai_dataset import (
    letterbox_image_array,
    unletterbox_mask_array,
    unletterbox_coordinates,
)
from app.services.measurements.config import MeasurementConfig, default_measurement_config
from app.services.measurements.geometry import extract_native_geometry
from app.services.measurements.jsw import calculate_jsw_profile
from app.services.measurements.calibration import apply_physical_calibration
from app.services.measurements.quality import evaluate_measurement_quality
from app.services.measurements.visualization import generate_measurement_visualization

# Singleton V2 segmentation model instance for measurements
v2_segmentation_model = SegmentationModel(
    config=SegmentationConfig(
        weights_path=Path(settings.MODEL_DIR / "best_model_v2.pth")
        if (settings.MODEL_DIR / "best_model_v2.pth").exists()
        else (Path(settings.MODEL_DIR / "best_model.pth") if (settings.MODEL_DIR / "best_model.pth").exists() else None),
        device=settings.DEVICE,
    )
)


def run_knee_measurement_pipeline(
    raw_image_array: np.ndarray,
    pixel_spacing: Optional[List[float]] = None,
    pred_mask_512: Optional[np.ndarray] = None,
    model: Optional[SegmentationModel] = None,
    config: MeasurementConfig = default_measurement_config,
    save_visualization: bool = True,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Execute end-to-end knee joint measurement pipeline directly on raw image array in native space.
    
    Args:
        raw_image_array: 2D numpy array of raw knee radiograph in original native dimensions.
        pixel_spacing: Optional physical spacing [sx, sy] in mm/pixel.
        pred_mask_512: Optional precomputed 512x512 predicted binary mask.
        model: Optional SegmentationModel instance.
        config: MeasurementConfig instance.
        save_visualization: Whether to render and save the measurement PNG.
        output_dir: Destination folder for artifacts.

    Returns:
        Structured measurement result dictionary.
    """
    t_start = time.time()
    seg_model = model or v2_segmentation_model

    # Ensure raw_image_array is 2D grayscale
    if raw_image_array.ndim == 3 and raw_image_array.shape[2] == 3:
        u8_native = raw_image_array[:, :, 0].astype(np.uint8)
    elif raw_image_array.ndim == 3 and raw_image_array.shape[0] == 3:
        u8_native = raw_image_array[0, :, :].astype(np.uint8)
    else:
        if raw_image_array.max() <= 1.0:
            u8_native = (raw_image_array * 255.0).clip(0, 255).astype(np.uint8)
        else:
            u8_native = raw_image_array.clip(0, 255).astype(np.uint8)

    orig_h, orig_w = u8_native.shape[:2]

    # Align orientation with MONAI ITK dataset convention (W, H) if raw image is (H, W)
    needs_transpose = (orig_h > orig_w)
    input_plane = u8_native.T if needs_transpose else u8_native

    # 1. Forward Letterbox Preprocessing
    padded_img, letterbox_meta = letterbox_image_array(
        input_plane, spatial_size=config.model_canvas_size, is_mask=False
    )

    # 2. Model Forward Pass if 512x512 mask is not precomputed
    if pred_mask_512 is None:
        if not seg_model.is_available():
            v2_weights = settings.MODEL_DIR / "best_model_v2.pth"
            if v2_weights.exists():
                seg_model.load_weights(v2_weights)

        if not seg_model.is_available():
            raise RuntimeError("Segmentation model weights are unavailable for measurement extraction.")

        # Intensity range percentile normalization via MONAI standard
        from monai.transforms import ScaleIntensityRangePercentiles
        scaler = ScaleIntensityRangePercentiles(lower=1, upper=99, b_min=0.0, b_max=1.0, clip=True)
        t_scaled = scaler(torch.from_numpy(padded_img).unsqueeze(0).float()).unsqueeze(0)
        
        logits = seg_model.predict(t_scaled)
        pred_mask_512 = torch.argmax(logits, dim=1)[0].cpu().numpy().astype(np.uint8)

    # 3. Inverse Letterbox Transform to Exact Native Resolution
    native_mask_unpadded = unletterbox_mask_array(pred_mask_512, letterbox_meta)
    native_mask = native_mask_unpadded.T if needs_transpose else native_mask_unpadded

    # Verify native space properties
    assert native_mask.shape == (orig_h, orig_w), f"Native mask shape {native_mask.shape} != original image shape {(orig_h, orig_w)}"

    # 4. Extract Native Geometry & Components
    geometry_metrics = extract_native_geometry(native_mask, min_pixels=config.min_foreground_pixels_native)

    # 5. Calculate Joint Space Width (JSW) Profiling
    jsw_metrics = calculate_jsw_profile(
        native_mask,
        min_samples=config.min_jsw_samples,
        margin_trim_ratio=config.margin_trim_ratio,
    )

    # 6. Physical Millimeter Calibration
    calibration_metrics = apply_physical_calibration(jsw_metrics, pixel_spacing=pixel_spacing)

    # 7. Evaluate Clinical Quality Assessment
    quality_metrics = evaluate_measurement_quality(
        geometry_metrics=geometry_metrics,
        jsw_metrics=jsw_metrics,
        calibration_metrics=calibration_metrics,
        config=config,
    )

    # 8. Render Visualizations if requested
    vis_path_str = None
    vis_relative_url = None
    if save_visualization:
        dest_dir = output_dir or (settings.RESULTS_DIR / config.measurements_dir_name)
        dest_dir.mkdir(parents=True, exist_ok=True)
        unique_token = uuid.uuid4().hex
        vis_filename = f"measurement_{unique_token}.png"
        vis_path = dest_dir / vis_filename

        generate_measurement_visualization(
            raw_native_img=u8_native,
            native_mask=native_mask,
            geometry_metrics=geometry_metrics,
            jsw_metrics=jsw_metrics,
            calibration_metrics=calibration_metrics,
            quality_metrics=quality_metrics,
            output_path=vis_path,
        )
        vis_path_str = str(vis_path.resolve())
        vis_relative_url = f"/results/{config.measurements_dir_name}/{vis_filename}"

    elapsed_ms = round((time.time() - t_start) * 1000.0, 1)

    return {
        "status": "completed",
        "model": "best_model_v2.pth",
        "native_dimensions": {
            "width": orig_w,
            "height": orig_h,
        },
        "segmentation": geometry_metrics,
        "jsw": jsw_metrics,
        "calibration": calibration_metrics,
        "quality": quality_metrics,
        "visualization_path": vis_path_str,
        "visualization_url": vis_relative_url,
        "processing_time_ms": elapsed_ms,
    }


def extract_measurements_for_scan(
    db: Session,
    scan_id: int,
    config: MeasurementConfig = default_measurement_config,
) -> Dict[str, Any]:
    """
    Database-aware entrypoint: extracts native knee joint measurements for an uploaded Scan record.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise LookupError(f"Scan with ID {scan_id} does not exist.")

    target_path = scan.preprocessed_path or scan.file_path
    if not target_path or not Path(target_path).exists():
        raise ValueError(f"Image file for Scan ID {scan_id} was not found on disk.")

    img_data = load_medical_image(Path(target_path))
    raw_array = img_data.data.astype(np.float32)

    # Pixel spacing from image metadata if available
    pixel_spacing = img_data.spacing if img_data.spacing is not None else None

    # Run pipeline
    results = run_knee_measurement_pipeline(
        raw_image_array=raw_array,
        pixel_spacing=pixel_spacing,
        config=config,
    )
    results["scan_id"] = scan.id

    return results
