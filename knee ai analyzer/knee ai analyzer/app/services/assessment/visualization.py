"""
Visualization Generator for Stage 11 Structured Research Knee Assessment.
Renders high-resolution diagnostic cards with clear non-diagnostic research styling.
"""

from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np
from PIL import Image, ImageDraw
import scipy.ndimage as ndi


def render_assessment_visual_report(
    raw_image: np.ndarray,
    pred_mask: np.ndarray,
    jsw_metrics: Dict[str, Any],
    seg_metrics: Dict[str, Any],
    cal_metrics: Dict[str, Any],
    qc_metrics: Dict[str, Any],
    reliability_score: float,
    scan_id: Optional[int],
    filename: str,
    output_path: Path,
) -> Path:
    """
    Generate high-resolution 4-panel research diagnostic visual report:
    [1. Native X-Ray | 2. Predicted Mask Overlay | 3. Native Contour & Bounding Box | 4. JSW Measurement Profile]
    """
    pw, ph = 350, 420
    header_h = 75
    footer_h = 35

    # 1. Base grayscale radiograph
    arr = raw_image.copy()
    if arr.dtype != np.uint8:
        if np.max(arr) <= 1.0 and np.min(arr) >= 0.0:
            arr = (arr * 255.0).astype(np.uint8)
        else:
            p_min, p_max = np.min(arr), np.max(arr)
            if p_max > p_min:
                arr = (((arr - p_min) / (p_max - p_min)) * 255.0).astype(np.uint8)
            else:
                arr = np.zeros_like(arr, dtype=np.uint8)
    else:
        arr = arr.astype(np.uint8)

    if arr.ndim == 3:
        if arr.shape[2] in (1, 3, 4):
            u8_native = arr[:, :, 0]
        elif arr.shape[0] in (1, 3, 4):
            u8_native = arr[0, :, :]
        else:
            u8_native = arr.squeeze()
    else:
        u8_native = arr

    orig_h, orig_w = u8_native.shape[:2]
    pil_raw = Image.fromarray(u8_native).convert("RGB").resize((pw, ph), Image.Resampling.BILINEAR)

    # 2. Predicted Mask Overlay
    overlay_rgb = np.stack([u8_native, u8_native, u8_native], axis=-1)
    mask_bool = pred_mask > 0
    if np.any(mask_bool):
        overlay_rgb[mask_bool, 0] = (overlay_rgb[mask_bool, 0] * 0.65 + 0 * 0.35).astype(np.uint8)
        overlay_rgb[mask_bool, 1] = (overlay_rgb[mask_bool, 1] * 0.65 + 200 * 0.35).astype(np.uint8)
        overlay_rgb[mask_bool, 2] = (overlay_rgb[mask_bool, 2] * 0.65 + 255 * 0.35).astype(np.uint8)
    pil_overlay = Image.fromarray(overlay_rgb).resize((pw, ph), Image.Resampling.BILINEAR)

    # 3. Native Contour & Bounding Box
    contour_rgb = np.stack([u8_native, u8_native, u8_native], axis=-1)
    pil_contour = Image.fromarray(contour_rgb).resize((pw, ph), Image.Resampling.BILINEAR)
    draw_contour = ImageDraw.Draw(pil_contour)

    scale_x = pw / float(orig_w)
    scale_y = ph / float(orig_h)

    bbox = seg_metrics.get("bounding_box")
    if bbox:
        bx1 = int(round(bbox["x_min"] * scale_x))
        by1 = int(round(bbox["y_min"] * scale_y))
        bx2 = int(round(bbox["x_max"] * scale_x))
        by2 = int(round(bbox["y_max"] * scale_y))
        draw_contour.rectangle([bx1, by1, bx2, by2], outline=(255, 215, 0), width=2)

    centroid = seg_metrics.get("centroid")
    if centroid:
        cx = int(round(centroid["x"] * scale_x))
        cy = int(round(centroid["y"] * scale_y))
        draw_contour.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(255, 60, 60), outline=(255, 255, 255))

    # 4. JSW Measurement Profile
    jsw_rgb = np.stack([u8_native, u8_native, u8_native], axis=-1)
    if np.any(mask_bool):
        jsw_rgb[mask_bool, 0] = (jsw_rgb[mask_bool, 0] * 0.75 + 0 * 0.25).astype(np.uint8)
        jsw_rgb[mask_bool, 1] = (jsw_rgb[mask_bool, 1] * 0.75 + 160 * 0.25).astype(np.uint8)
        jsw_rgb[mask_bool, 2] = (jsw_rgb[mask_bool, 2] * 0.75 + 230 * 0.25).astype(np.uint8)

    pil_jsw = Image.fromarray(jsw_rgb).resize((pw, ph), Image.Resampling.BILINEAR)
    draw_jsw = ImageDraw.Draw(pil_jsw)

    samples = jsw_metrics.get("profile_samples", [])
    if samples:
        step = max(1, len(samples) // 30)
        for idx in range(0, len(samples), step):
            s = samples[idx]
            sx = int(round(s["x"] * scale_x))
            sy1 = int(round(s["y_superior"] * scale_y))
            sy2 = int(round(s["y_inferior"] * scale_y))
            draw_jsw.line([(sx, sy1), (sx, sy2)], fill=(0, 255, 120), width=1)

        min_s = min(samples, key=lambda s: s["jsw_px"])
        max_s = max(samples, key=lambda s: s["jsw_px"])

        # Min JSW (Orange line)
        mx = int(round(min_s["x"] * scale_x))
        my1 = int(round(min_s["y_superior"] * scale_y))
        my2 = int(round(min_s["y_inferior"] * scale_y))
        draw_jsw.line([(mx, my1), (mx, my2)], fill=(255, 120, 0), width=3)

        # Max JSW (Purple line)
        Mx = int(round(max_s["x"] * scale_x))
        My1 = int(round(max_s["y_superior"] * scale_y))
        My2 = int(round(max_s["y_inferior"] * scale_y))
        draw_jsw.line([(Mx, My1), (Mx, My2)], fill=(200, 50, 255), width=3)

    # Combine into wide canvas
    total_w = pw * 4
    total_h = ph + header_h + footer_h
    card = Image.new("RGB", (total_w, total_h), (18, 22, 28))

    card.paste(pil_raw, (0, header_h))
    card.paste(pil_overlay, (pw, header_h))
    card.paste(pil_contour, (pw * 2, header_h))
    card.paste(pil_jsw, (pw * 3, header_h))

    draw = ImageDraw.Draw(card)

    # Panel titles
    draw.text((10, header_h + 10), "1. Original Radiograph", fill=(210, 210, 210))
    draw.text((pw + 10, header_h + 10), "2. V2 Predicted Joint Mask", fill=(0, 200, 255))
    draw.text((pw * 2 + 10, header_h + 10), "3. Native ROI & Centroid", fill=(255, 215, 0))
    draw.text((pw * 3 + 10, header_h + 10), "4. JSW Measurement Profile", fill=(0, 255, 120))

    # Header Badges & Summary
    status_str = qc_metrics.get("status", "VALID")
    status_colors = {
        "VALID": (0, 180, 80),
        "VALID_WITH_WARNING": (220, 140, 0),
        "INVALID": (220, 40, 40),
    }
    badge_col = status_colors.get(status_str, (100, 100, 100))

    draw.rectangle([15, 12, 160, 42], fill=badge_col)
    draw.text((25, 18), f"QC: {status_str}", fill=(255, 255, 255))

    # Reliability badge
    score_col = (0, 180, 120) if reliability_score >= 0.8 else ((220, 150, 0) if reliability_score >= 0.5 else (220, 50, 50))
    draw.rectangle([170, 12, 340, 42], fill=score_col)
    draw.text((180, 18), f"Reliability: {reliability_score:.2f} / 1.00", fill=(255, 255, 255))

    med_px = jsw_metrics.get("median_px", "--")
    min_px = jsw_metrics.get("min_px", "--")
    max_px = jsw_metrics.get("max_px", "--")
    cal_str = "Calibrated (mm)" if cal_metrics.get("available") else "Uncalibrated (px)"

    info_str = (
        f"File: {filename} | Dims: {orig_w}x{orig_h} px | "
        f"JSW Median: {med_px} px | Min: {min_px} px | Max: {max_px} px | {cal_str}"
    )
    draw.text((355, 20), info_str, fill=(240, 240, 240))

    # Top & Bottom Safety Disclaimers
    disclaimer = "RESEARCH / PROTOTYPE ONLY — NOT A CLINICAL DIAGNOSIS — NO OA GRADING OR SURGICAL SIZING"
    draw.text((total_w // 2 - 280, 50), disclaimer, fill=(255, 180, 0))

    draw.rectangle([0, total_h - footer_h, total_w, total_h], fill=(12, 15, 20))
    draw.text((total_w // 2 - 260, total_h - footer_h + 10), disclaimer, fill=(180, 180, 180))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    card.save(str(output_path))
    return output_path
