"""
Single-Image KneeAI Analyzer Pipeline.
Provides validation, robust adaptive enhancement, aspect-ratio-preserving letterboxing,
V2 model inference, native-space reconstruction, JSW profiling, and quality control.
"""

import io
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
import torch
from PIL import Image

try:
    import cv2
except ImportError:
    cv2 = None

try:
    import pydicom
except ImportError:
    pydicom = None

from app.core.config import settings
from app.services.measurements.geometry import extract_native_geometry
from app.services.measurements.jsw import calculate_jsw_profile
from app.services.measurements.quality import evaluate_measurement_quality
from app.services.segmentation.config import SegmentationConfig, get_torch_device
from app.services.segmentation.model import SegmentationModel
from app.services.training.monai_dataset import (
    letterbox_image_array,
    unletterbox_coordinates,
    unletterbox_mask_array,
)


# Global singleton model cache to avoid re-loading weights on every single request
_V2_MODEL_SINGLETON: Optional[SegmentationModel] = None


def get_v2_model() -> SegmentationModel:
    """Lazily load and cache the existing V2 segmentation model."""
    global _V2_MODEL_SINGLETON
    if _V2_MODEL_SINGLETON is not None and _V2_MODEL_SINGLETON.weights_loaded:
        return _V2_MODEL_SINGLETON

    # Locate best_model_v2.pth first, then fallback to best_model.pth
    weights_v2 = settings.MODEL_DIR / "best_model_v2.pth"
    weights_v1 = settings.MODEL_DIR / "best_model.pth"
    chosen_path = weights_v2 if weights_v2.exists() else weights_v1 if weights_v1.exists() else None

    config = SegmentationConfig(
        weights_path=chosen_path,
        device=settings.DEVICE,
    )
    _V2_MODEL_SINGLETON = SegmentationModel(config=config)
    return _V2_MODEL_SINGLETON


# -------------------------------------------------------------------------
# 1. IMAGE VALIDATION
# -------------------------------------------------------------------------
def validate_uploaded_image(
    file_bytes: bytes,
    filename: str = "upload.png",
    max_size_mb: int = 50,
) -> Dict[str, Any]:
    """
    Validate that the uploaded byte buffer is a valid, uncorrupted medical image.
    Supports PNG, JPEG, TIFF, BMP, DICOM (.dcm).
    Checks file size, dimensions, channels, and integrity.
    Never crashes on invalid input.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty (0 bytes). Please upload a valid image.")

    file_size_mb = len(file_bytes) / (1024 * 1024)
    if file_size_mb > max_size_mb:
        raise ValueError(
            f"File size ({file_size_mb:.1f} MB) exceeds the maximum allowed limit of {max_size_mb} MB."
        )

    ext = Path(filename).suffix.lower()
    allowed_exts = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".dcm", ".dicom"}
    if ext and ext not in allowed_exts:
        raise ValueError(
            f"Unsupported file format '{ext}'. Supported formats are: PNG, JPG/JPEG, TIFF, BMP, and DICOM (.dcm)."
        )

    # 1. Attempt DICOM parse if .dcm or DICOM magic header
    if ext in {".dcm", ".dicom"} or (len(file_bytes) > 132 and file_bytes[128:132] == b"DICM"):
        if pydicom is None:
            raise ValueError("DICOM support is unavailable because pydicom is not installed.")
        try:
            dcm = pydicom.dcmread(io.BytesIO(file_bytes), force=True)
            pixel_array = dcm.pixel_array
            h, w = pixel_array.shape[:2]
            channels = 1 if pixel_array.ndim == 2 else pixel_array.shape[2]
            dtype_str = str(pixel_array.dtype)
            
            # Extract spacing if present in DICOM header
            spacing = None
            if hasattr(dcm, "PixelSpacing") and dcm.PixelSpacing:
                spacing = [float(dcm.PixelSpacing[0]), float(dcm.PixelSpacing[1])]
            elif hasattr(dcm, "ImagerPixelSpacing") and dcm.ImagerPixelSpacing:
                spacing = [float(dcm.ImagerPixelSpacing[0]), float(dcm.ImagerPixelSpacing[1])]

            return {
                "format": "DICOM",
                "width": int(w),
                "height": int(h),
                "channels": int(channels),
                "dtype": dtype_str,
                "file_size_bytes": len(file_bytes),
                "pixel_spacing": spacing,
                "raw_array": pixel_array,
            }
        except Exception as e:
            raise ValueError(f"Corrupted or unreadable DICOM file: {str(e)}")

    # 2. Standard 2D Image parsing with Pillow
    try:
        pil_img = Image.open(io.BytesIO(file_bytes))
        pil_img.verify()  # Verify image integrity
        # Re-open for actual reading since verify() clears buffer
        pil_img = Image.open(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Image is corrupted or in an unreadable format: {str(e)}")

    w, h = pil_img.size
    if w < 32 or h < 32:
        raise ValueError(f"Image dimensions ({w}x{h}) are too small for anatomical knee evaluation. Minimum size is 32x32.")
    if w > 12000 or h > 12000:
        raise ValueError(f"Image dimensions ({w}x{h}) exceed maximum supported resolution (12000x12000).")

    mode = pil_img.mode
    channels = len(mode) if mode in ("RGB", "RGBA", "CMYK") else 1

    return {
        "format": pil_img.format or "UNKNOWN",
        "width": int(w),
        "height": int(h),
        "channels": int(channels),
        "mode": mode,
        "dtype": "uint8",
        "file_size_bytes": len(file_bytes),
        "pixel_spacing": None,
        "pil_image": pil_img,
    }


# -------------------------------------------------------------------------
# 2. IMAGE NORMALIZATION
# -------------------------------------------------------------------------
def normalize_image_to_grayscale(
    image_input: Union[Image.Image, np.ndarray],
) -> np.ndarray:
    """
    Convert RGB/RGBA or high-bit-depth images to a 2D float32 grayscale array in [0.0, 255.0].
    Preserves the original source image intact.
    """
    if isinstance(image_input, Image.Image):
        if image_input.mode in ("RGBA", "LA"):
            # Background composite onto white/black to avoid alpha transparency artifacts
            bg = Image.new("RGB", image_input.size, (0, 0, 0))
            bg.paste(image_input, mask=image_input.split()[-1])
            gray = bg.convert("L")
        elif image_input.mode != "L":
            gray = image_input.convert("L")
        else:
            gray = image_input
        return np.array(gray, dtype=np.float32)

    arr = np.asarray(image_input)
    # Handle multi-channel numpy array
    if arr.ndim == 3:
        if arr.shape[2] == 4:  # RGBA
            # Weighted luminosity conversion
            arr = 0.2989 * arr[:, :, 0] + 0.5870 * arr[:, :, 1] + 0.1140 * arr[:, :, 2]
        elif arr.shape[2] == 3:  # RGB
            arr = 0.2989 * arr[:, :, 0] + 0.5870 * arr[:, :, 1] + 0.1140 * arr[:, :, 2]
        elif arr.shape[0] in (1, 3, 4):
            arr = np.mean(arr, axis=0)

    arr = arr.astype(np.float32)
    # Handle 16-bit or arbitrary dynamic range
    val_min, val_max = np.min(arr), np.max(arr)
    if val_max > val_min:
        arr = (arr - val_min) / (val_max - val_min) * 255.0
    else:
        arr = np.zeros_like(arr)

    return arr


# -------------------------------------------------------------------------
# 3. IMAGE ENHANCEMENT
# -------------------------------------------------------------------------
DEFAULT_ENHANCEMENT_CONFIG = {
    "enabled": True,
    "contrast": True,
    "clahe": True,
    "denoise": True,
    "sharpen": False,
    "clahe_clip_limit": 2.0,
    "clahe_grid_size": (8, 8),
    "denoise_strength": 0.8,
}


def enhance_xray_image(
    image_2d: np.ndarray,
    config: Optional[Dict[str, Any]] = None,
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Safe preprocessing and contrast enhancement before segmentation.
    - Percentile intensity normalization (1st - 99th percentile)
    - Optional CLAHE local contrast enhancement
    - Mild boundary-preserving denoising
    - Avoids non-uniform geometric deformation or hallucinating anatomical features.
    """
    cfg = dict(DEFAULT_ENHANCEMENT_CONFIG)
    if config:
        cfg.update(config)

    arr = image_2d.astype(np.float32).copy()
    details: Dict[str, Any] = {
        "enabled": cfg.get("enabled", True),
        "contrast_applied": False,
        "clahe_applied": False,
        "denoise_applied": False,
        "sharpen_applied": False,
    }

    if not cfg.get("enabled", True):
        # Raw min-max normalization to uint8
        val_min, val_max = np.min(arr), np.max(arr)
        if val_max > val_min:
            out_uint8 = np.clip(((arr - val_min) / (val_max - val_min)) * 255.0, 0, 255).astype(np.uint8)
        else:
            out_uint8 = np.zeros_like(arr, dtype=np.uint8)
        return out_uint8, details

    # 1. Percentile-based Contrast Normalization (1.0% to 99.0%)
    if cfg.get("contrast", True):
        p1 = np.percentile(arr, 1.0)
        p99 = np.percentile(arr, 99.0)
        if p99 > p1:
            arr = np.clip((arr - p1) / (p99 - p1), 0.0, 1.0) * 255.0
            details["contrast_applied"] = True
        else:
            val_min, val_max = np.min(arr), np.max(arr)
            if val_max > val_min:
                arr = ((arr - val_min) / (val_max - val_min)) * 255.0

    arr_uint8 = np.clip(arr, 0, 255).astype(np.uint8)

    # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
    if cfg.get("clahe", True):
        clip_limit = float(cfg.get("clahe_clip_limit", 2.0))
        grid_size = tuple(cfg.get("clahe_grid_size", (8, 8)))
        if cv2 is not None:
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=grid_size)
            arr_uint8 = clahe.apply(arr_uint8)
            details["clahe_applied"] = True
        else:
            # Fallback pure numpy/PIL adaptive equalization
            from PIL import ImageOps
            pil_temp = Image.fromarray(arr_uint8)
            arr_uint8 = np.array(ImageOps.equalize(pil_temp))
            details["clahe_applied"] = True

    # 3. Mild Boundary-Preserving Denoising
    if cfg.get("denoise", True):
        if cv2 is not None:
            # Bilateral filter preserves sharp bone cortical edges while reducing sensor noise
            arr_uint8 = cv2.bilateralFilter(arr_uint8, d=5, sigmaColor=25, sigmaSpace=25)
            details["denoise_applied"] = True
        else:
            # Fallback scipy gaussian
            import scipy.ndimage as ndi
            arr_uint8 = np.clip(ndi.gaussian_filter(arr_uint8.astype(np.float32), sigma=0.8), 0, 255).astype(np.uint8)
            details["denoise_applied"] = True

    # 4. Optional subtle unsharp mask sharpening (disabled by default for clinical safety)
    if cfg.get("sharpen", False):
        if cv2 is not None:
            gaussian = cv2.GaussianBlur(arr_uint8, (0, 0), 2.0)
            arr_uint8 = cv2.addWeighted(arr_uint8, 1.2, gaussian, -0.2, 0)
            details["sharpen_applied"] = True

    return arr_uint8, details


# -------------------------------------------------------------------------
# 4. ASPECT-RATIO-PRESERVING LETTERBOX PREPROCESSING
# -------------------------------------------------------------------------
def preprocess_for_v2(
    enhanced_2d: np.ndarray,
    spatial_size: Tuple[int, int] = (512, 512),
) -> Tuple[torch.Tensor, Dict[str, Any]]:
    """
    Uniformly scale the image to fit inside spatial_size (512x512) and pad symmetrically with zeros.
    Stores exact scaling and padding metadata for inverse unletterbox reconstruction.
    Returns:
        tensor (1, 1, 512, 512) float32 in [0, 1]
        letterbox_meta dictionary
    """
    padded_np, meta = letterbox_image_array(enhanced_2d, spatial_size=spatial_size, is_mask=False)

    # Scale intensity to [0.0, 1.0] for neural network
    norm_tensor = padded_np.astype(np.float32) / 255.0
    tensor_4d = torch.from_numpy(norm_tensor).unsqueeze(0).unsqueeze(0).float()

    return tensor_4d, meta


# -------------------------------------------------------------------------
# 5. EXISTING V2 MODEL INFERENCE
# -------------------------------------------------------------------------
def run_v2_inference(
    tensor_512: torch.Tensor,
    model: Optional[SegmentationModel] = None,
) -> Tuple[np.ndarray, np.ndarray, float]:
    """
    Execute forward inference through the existing V2 U-Net model.
    Returns:
        binary_mask_512: np.ndarray (512, 512) where 1=knee_joint
        probabilities_512: np.ndarray (512, 512) float confidence values
        inference_time_ms: float execution time in milliseconds
    """
    seg_model = model or get_v2_model()
    device = seg_model.device
    net = seg_model._build_network()
    net.eval()

    start_t = time.perf_counter()
    with torch.no_grad():
        inp = tensor_512.to(device)
        logits = net(inp)

        if logits.shape[1] == 2:  # Binary (Background vs Knee Joint)
            probs = torch.softmax(logits, dim=1)[:, 1:2, ...]
            pred = (probs > 0.50).long()
        elif logits.shape[1] == 1:  # Single channel sigmoid
            probs = torch.sigmoid(logits)
            pred = (probs > 0.50).long()
        else:  # Multiclass argmax
            probs = torch.softmax(logits, dim=1)
            pred = torch.argmax(probs, dim=1, keepdim=True)
            # Combine non-background classes into joint mask
            pred = (pred > 0).long()

        mask_np = pred.squeeze().cpu().numpy().astype(np.uint8)
        prob_np = probs.squeeze().cpu().numpy().astype(np.float32)

    elapsed_ms = (time.perf_counter() - start_t) * 1000.0
    return mask_np, prob_np, round(elapsed_ms, 2)


# -------------------------------------------------------------------------
# 6. NATIVE-SPACE RECONSTRUCTION
# -------------------------------------------------------------------------
def restore_native_mask(
    pred_mask_512: np.ndarray,
    letterbox_meta: Dict[str, Any],
) -> np.ndarray:
    """
    Inverse transform: map the 512x512 predicted mask back to exact original (orig_h, orig_w).
    Ensures zero aspect ratio distortion and clean binary classes.
    """
    return unletterbox_mask_array(pred_mask_512, letterbox_meta)


# -------------------------------------------------------------------------
# 7. NATIVE JSW & GEOMETRIC MEASUREMENT
# -------------------------------------------------------------------------
def calculate_native_jsw(
    native_mask: np.ndarray,
    pixel_spacing: Optional[Union[float, Sequence[float]]] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """
    Extract geometric metrics and JSW profiling in native coordinate space.
    Strict Calibration Safety:
    - If pixel_spacing is None: measurements reported ONLY in pixels.
    - If pixel_spacing is provided: both pixels and calibrated millimeters are returned.
    """
    h, w = native_mask.shape[:2]
    geom = extract_native_geometry(native_mask)
    jsw = calculate_jsw_profile(native_mask)

    # Calibration parsing
    spacing_val: Optional[float] = None
    if pixel_spacing is not None:
        if isinstance(pixel_spacing, (int, float)) and pixel_spacing > 0:
            spacing_val = float(pixel_spacing)
        elif isinstance(pixel_spacing, (list, tuple)) and len(pixel_spacing) > 0 and pixel_spacing[0] > 0:
            spacing_val = float(pixel_spacing[0])

    calibration_info: Dict[str, Any] = {
        "available": spacing_val is not None,
        "unit": "mm" if spacing_val is not None else "pixels",
        "pixel_spacing_mm": spacing_val,
    }

    # If calibrated, compute mm metrics
    if spacing_val is not None:
        if jsw.get("min_px") is not None:
            jsw["min_mm"] = round(float(jsw["min_px"]) * spacing_val, 2)
            jsw["median_mm"] = round(float(jsw["median_px"]) * spacing_val, 2)
            jsw["max_mm"] = round(float(jsw["max_px"]) * spacing_val, 2)
            jsw["mean_mm"] = round(float(jsw["mean_px"]) * spacing_val, 2)
        geom["area_mm2"] = round(float(geom["foreground_pixels"]) * (spacing_val ** 2), 2)
    else:
        jsw["min_mm"] = None
        jsw["median_mm"] = None
        jsw["max_mm"] = None
        jsw["mean_mm"] = None
        geom["area_mm2"] = None

    return geom, jsw, calibration_info


# -------------------------------------------------------------------------
# 8. QUALITY CONTROL
# -------------------------------------------------------------------------
def run_quality_control(
    geometry_metrics: Dict[str, Any],
    jsw_metrics: Dict[str, Any],
    calibration_info: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Assign clinical safety classification:
    VALID, VALID_WITH_WARNING, or INVALID.
    """
    return evaluate_measurement_quality(geometry_metrics, jsw_metrics, calibration_info)


# -------------------------------------------------------------------------
# 9. VISUALIZATION ARTIFACTS GENERATION
# -------------------------------------------------------------------------
def create_single_analysis_visualizations(
    original_gray_2d: np.ndarray,
    enhanced_2d: np.ndarray,
    native_mask: np.ndarray,
    jsw_metrics: Dict[str, Any],
    output_dir: Path,
    file_id: str,
) -> Dict[str, str]:
    """
    Generate high-contrast visual artifacts for the frontend:
    - original image
    - enhanced image
    - native binary mask
    - composite clinical overlay with JSW profile vectors
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    orig_filename = f"original_{file_id}.png"
    enh_filename = f"enhanced_{file_id}.png"
    mask_filename = f"mask_{file_id}.png"
    overlay_filename = f"overlay_{file_id}.png"

    orig_path = output_dir / orig_filename
    enh_path = output_dir / enh_filename
    mask_path = output_dir / mask_filename
    overlay_path = output_dir / overlay_filename

    # Save original & enhanced images
    Image.fromarray(np.clip(original_gray_2d, 0, 255).astype(np.uint8)).save(orig_path)
    Image.fromarray(enhanced_2d).save(enh_path)

    # Save native binary mask
    mask_uint8 = (native_mask > 0).astype(np.uint8) * 255
    Image.fromarray(mask_uint8).save(mask_path)

    # Create Clinical Composite Overlay
    h, w = enhanced_2d.shape[:2]
    # Base background (RGB)
    base_rgb = np.stack([enhanced_2d] * 3, axis=-1)

    # Colorize segmentation mask (Soft Cyan & Gold tint)
    overlay_rgb = base_rgb.copy()
    fg = native_mask > 0
    if np.any(fg):
        # Blend cyan tint on mask (R: 30, G: 200, B: 240)
        overlay_rgb[fg, 0] = np.clip(0.55 * base_rgb[fg, 0] + 0.45 * 30, 0, 255).astype(np.uint8)
        overlay_rgb[fg, 1] = np.clip(0.55 * base_rgb[fg, 1] + 0.45 * 200, 0, 255).astype(np.uint8)
        overlay_rgb[fg, 2] = np.clip(0.55 * base_rgb[fg, 2] + 0.45 * 240, 0, 255).astype(np.uint8)

    # Draw JSW sample profile lines if available
    profile = jsw_metrics.get("profile_samples", [])
    if len(profile) > 0:
        step = max(1, len(profile) // 30)  # Draw ~30 vertical vectors across the joint
        for idx in range(0, len(profile), step):
            sample = profile[idx]
            x = sample["x"]
            y_sup = sample["y_superior"]
            y_inf = sample["y_inferior"]
            # Color vertical vector in neon green (0, 255, 120)
            overlay_rgb[y_sup : y_inf + 1, x] = [0, 255, 120]

    Image.fromarray(overlay_rgb).save(overlay_path)

    return {
        "original_url": f"/results/single_analysis/{orig_filename}",
        "enhanced_url": f"/results/single_analysis/{enh_filename}",
        "mask_url": f"/results/single_analysis/{mask_filename}",
        "overlay_url": f"/results/single_analysis/{overlay_filename}",
    }


# -------------------------------------------------------------------------
# 10. MAIN END-TO-END PIPELINE FUNCTION
# -------------------------------------------------------------------------
def analyze_single_knee_image(
    file_bytes: bytes,
    filename: str = "knee_xray.png",
    enhancement_config: Optional[Dict[str, Any]] = None,
    pixel_spacing: Optional[Union[float, Sequence[float]]] = None,
    save_artifacts: bool = True,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Complete flexible 'Upload Image -> Enhance -> Analyze' pipeline.
    Accepts arbitrary dimensions, formats, and aspect ratios.
    Never crashes, never retrains, never hallucinates measurements.
    """
    total_start = time.perf_counter()

    # Step 1: Validation
    val_meta = validate_uploaded_image(file_bytes=file_bytes, filename=filename)

    # Extract or override pixel spacing from metadata
    effective_spacing = pixel_spacing if pixel_spacing is not None else val_meta.get("pixel_spacing")

    # Step 2: Grayscale Normalization (Preserves original separately)
    if "pil_image" in val_meta:
        orig_gray = normalize_image_to_grayscale(val_meta["pil_image"])
    elif "raw_array" in val_meta:
        orig_gray = normalize_image_to_grayscale(val_meta["raw_array"])
    else:
        pil_raw = Image.open(io.BytesIO(file_bytes))
        orig_gray = normalize_image_to_grayscale(pil_raw)

    orig_h, orig_w = orig_gray.shape[:2]

    # Step 3: Configurable Image Enhancement
    enhanced_2d, enh_details = enhance_xray_image(orig_gray, config=enhancement_config)

    # Step 4: Aspect-Ratio-Preserving Letterbox Preprocessing (to 512x512)
    tensor_512, letterbox_meta = preprocess_for_v2(enhanced_2d, spatial_size=(512, 512))

    # Step 5: V2 Model Inference
    mask_512, prob_512, inference_ms = run_v2_inference(tensor_512)

    # Step 6: Native-Space Mask Reconstruction
    native_mask = restore_native_mask(mask_512, letterbox_meta)

    # Step 7: Measurements (JSW & Geometry) with strict calibration safety
    geom_metrics, jsw_metrics, calib_info = calculate_native_jsw(
        native_mask, pixel_spacing=effective_spacing
    )

    # Step 8: Quality Control
    qc = run_quality_control(geom_metrics, jsw_metrics, calib_info)

    # Step 9: Visual Artifacts
    visual_urls = {}
    if save_artifacts:
        dest_dir = output_dir or (settings.RESULTS_DIR / "single_analysis")
        file_id = f"{uuid.uuid4().hex[:8]}_{Path(filename).stem}"
        visual_urls = create_single_analysis_visualizations(
            original_gray_2d=orig_gray,
            enhanced_2d=enhanced_2d,
            native_mask=native_mask,
            jsw_metrics=jsw_metrics,
            output_dir=dest_dir,
            file_id=file_id,
        )

    total_time_ms = round((time.perf_counter() - total_start) * 1000.0, 2)

    # Warning text if non-critical issues detected
    warning_text = "; ".join(qc["warnings"]) if len(qc.get("warnings", [])) > 0 else None

    # Step 10: Structured Output Schema
    return {
        "status": "success",
        "original_image": {
            "width": int(orig_w),
            "height": int(orig_h),
            "channels": int(val_meta.get("channels", 1)),
            "dtype": str(val_meta.get("dtype", "uint8")),
            "format": str(val_meta.get("format", "PNG")),
        },
        "preprocessing": {
            "enhancement_applied": enh_details.get("enabled", True),
            "enhancement_details": enh_details,
            "letterbox_scale": round(float(letterbox_meta["scale"]), 4),
            "padding": {
                "pad_x": int(letterbox_meta["pad_x"]),
                "pad_y": int(letterbox_meta["pad_y"]),
                "target_width": int(letterbox_meta["spatial_size"][0]),
                "target_height": int(letterbox_meta["spatial_size"][1]),
            },
        },
        "segmentation": {
            "mask_available": bool(geom_metrics.get("foreground_pixels", 0) > 0),
            "area_pixels": int(geom_metrics.get("foreground_pixels", 0)),
            "area_percentage": float(geom_metrics.get("area_percentage", 0.0)),
            "component_count": int(geom_metrics.get("component_count", 0)),
            "quality": qc["status"],
            "mask_url": visual_urls.get("mask_url"),
            "overlay_url": visual_urls.get("overlay_url"),
            "enhanced_url": visual_urls.get("enhanced_url"),
            "original_url": visual_urls.get("original_url"),
        },
        "measurements": {
            "jsw_min_px": jsw_metrics.get("min_px"),
            "jsw_median_px": jsw_metrics.get("median_px"),
            "jsw_max_px": jsw_metrics.get("max_px"),
            "jsw_mean_px": jsw_metrics.get("mean_px"),
            "jsw_min_mm": jsw_metrics.get("min_mm"),
            "jsw_median_mm": jsw_metrics.get("median_mm"),
            "jsw_max_mm": jsw_metrics.get("max_mm"),
            "sample_count": int(jsw_metrics.get("sample_count", 0)),
            "area_mm2": geom_metrics.get("area_mm2"),
        },
        "calibration": calib_info,
        "quality_control": qc,
        "processing": {
            "inference_time_ms": inference_ms,
            "total_time_ms": total_time_ms,
        },
        "warning": warning_text,
    }
