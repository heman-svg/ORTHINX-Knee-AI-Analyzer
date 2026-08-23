"""
Measurement Visualization Generator in Native Radiograph Resolution.
Draws native segmentation contour, bounding box, JSW sampling lines, and clinical quality badge.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import scipy.ndimage as ndi


def generate_measurement_visualization(
    raw_native_img: np.ndarray,
    native_mask: np.ndarray,
    geometry_metrics: Dict[str, Any],
    jsw_metrics: Dict[str, Any],
    calibration_metrics: Dict[str, Any],
    quality_metrics: Dict[str, Any],
    output_path: Optional[Path] = None,
    max_display_dim: int = 1200,
) -> Image.Image:
    """
    Generate an annotated diagnostic visualization for native-space knee joint measurements.
    
    Args:
        raw_native_img: 2D or 3D grayscale/RGB array in native image resolution.
        native_mask: 2D binary array (H, W) in native image resolution.
        geometry_metrics: Dictionary containing bounding_box, centroid, etc.
        jsw_metrics: Dictionary containing min_px, median_px, profile_samples, etc.
        calibration_metrics: Dictionary containing calibration status and mm values.
        quality_metrics: Dictionary containing status, warnings.
        output_path: Optional path to save the generated PNG.
        max_display_dim: Maximum dimension for the exported image to maintain web performance.

    Returns:
        PIL Image object of the rendered visualization.
    """
    # Normalize base image to RGB uint8
    if raw_native_img.ndim == 3 and raw_native_img.shape[2] == 3:
        base_arr = raw_native_img.astype(np.uint8)
    else:
        if raw_native_img.max() <= 1.0:
            base_u8 = (raw_native_img * 255.0).clip(0, 255).astype(np.uint8)
        else:
            base_u8 = raw_native_img.clip(0, 255).astype(np.uint8)
        base_arr = np.stack([base_u8, base_u8, base_u8], axis=-1)

    orig_h, orig_w = base_arr.shape[:2]
    
    # Scale down if extremely large for visualization rendering
    render_scale = 1.0
    if max(orig_w, orig_h) > max_display_dim:
        render_scale = max_display_dim / float(max(orig_w, orig_h))
        new_w = int(round(orig_w * render_scale))
        new_h = int(round(orig_h * render_scale))
        base_pil = Image.fromarray(base_arr).resize((new_w, new_h), Image.Resampling.BILINEAR)
    else:
        new_w, new_h = orig_w, orig_h
        base_pil = Image.fromarray(base_arr)

    # Blend cyan mask overlay
    mask_bool = native_mask > 0
    if np.any(mask_bool):
        # Resize mask to render dimensions
        pil_mask = Image.fromarray((mask_bool * 255).astype(np.uint8)).resize((new_w, new_h), Image.Resampling.NEAREST)
        mask_render = np.array(pil_mask) > 127
        
        overlay_arr = np.array(base_pil).astype(np.float32)
        # Cyan color (0, 220, 255) with alpha=0.35
        overlay_arr[mask_render, 0] = overlay_arr[mask_render, 0] * 0.65 + 0.0 * 0.35
        overlay_arr[mask_render, 1] = overlay_arr[mask_render, 1] * 0.65 + 220.0 * 0.35
        overlay_arr[mask_render, 2] = overlay_arr[mask_render, 2] * 0.65 + 255.0 * 0.35
        base_pil = Image.fromarray(overlay_arr.clip(0, 255).astype(np.uint8))

    draw = ImageDraw.Draw(base_pil)

    # 1. Draw Bounding Box (Golden Yellow)
    bbox = geometry_metrics.get("bounding_box")
    if bbox:
        rx_min = int(round(bbox["x_min"] * render_scale))
        ry_min = int(round(bbox["y_min"] * render_scale))
        rx_max = int(round(bbox["x_max"] * render_scale))
        ry_max = int(round(bbox["y_max"] * render_scale))
        draw.rectangle([rx_min, ry_min, rx_max, ry_max], outline=(255, 215, 0), width=2)
        draw.text((rx_min + 4, ry_min + 4), "ROI: Joint Space", fill=(255, 215, 0))

    # 2. Draw JSW Measurement Profile Lines (Green / Orange)
    profile_samples = jsw_metrics.get("profile_samples", [])
    if profile_samples:
        step = max(1, len(profile_samples) // 25)  # Sample ~25 lines to prevent visual clutter
        for idx in range(0, len(profile_samples), step):
            s = profile_samples[idx]
            sx = int(round(s["x"] * render_scale))
            sy1 = int(round(s["y_superior"] * render_scale))
            sy2 = int(round(s["y_inferior"] * render_scale))
            # Draw vertical measurement span
            draw.line([(sx, sy1), (sx, sy2)], fill=(0, 255, 150), width=2)
            # Draw end markers
            draw.ellipse([sx - 2, sy1 - 2, sx + 2, sy1 + 2], fill=(255, 255, 255))
            draw.ellipse([sx - 2, sy2 - 2, sx + 2, sy2 + 2], fill=(255, 255, 255))

    # 3. Draw Info & Quality Badge Banner at the top
    status_str = quality_metrics.get("status", "VALID")
    status_colors = {
        "VALID": (0, 180, 80),
        "VALID_WITH_WARNING": (230, 150, 0),
        "INVALID": (220, 50, 50),
    }
    badge_color = status_colors.get(status_str, (100, 100, 100))

    # Banner Background
    banner_h = 75
    draw.rectangle([0, 0, new_w, banner_h], fill=(20, 24, 30))
    
    # Status Badge
    draw.rectangle([12, 12, 180, 42], fill=badge_color)
    draw.text((22, 18), f"QUALITY: {status_str}", fill=(255, 255, 255))

    # Quantitative JSW Summary
    min_val = jsw_metrics.get("min_px", "--")
    med_val = jsw_metrics.get("median_px", "--")
    mean_val = jsw_metrics.get("mean_px", "--")
    samples_val = jsw_metrics.get("sample_count", 0)

    unit = "px"
    if calibration_metrics.get("available") and calibration_metrics.get("jsw_mm", {}).get("median_mm") is not None:
        med_mm = calibration_metrics["jsw_mm"]["median_mm"]
        summary_text = f"JSW Median: {med_val} px ({med_mm} mm) | Min: {min_val} px | Mean: {mean_val} px | Samples: {samples_val}"
    else:
        summary_text = f"JSW Median: {med_val} px | Min: {min_val} px | Mean: {mean_val} px | Samples: {samples_val} (Uncalibrated)"

    draw.text((195, 18), summary_text, fill=(240, 240, 240))
    draw.text((15, 48), f"Dimensions: {orig_w}x{orig_h} px | KneeAI Native Space Geometric Assessment", fill=(160, 170, 185))

    if output_path is not None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        base_pil.save(str(output_path))

    return base_pil
