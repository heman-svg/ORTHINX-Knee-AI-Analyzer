from pathlib import Path
from typing import Optional, Dict
import numpy as np
from PIL import Image


# Visual color mapping for overlay debugging (RGB)
CLASS_COLORS: Dict[int, tuple] = {
    0: (0, 0, 0),        # Background: transparent / black
    1: (255, 60, 60),    # Femur: Red
    2: (60, 180, 255),   # Tibia: Blue
    3: (60, 255, 120),   # Meniscus: Green
}


def create_segmentation_overlay(
    image_2d: np.ndarray,
    mask_2d: np.ndarray,
    alpha: float = 0.45
) -> Image.Image:
    """
    Generate an RGB image overlaying colored segmentation labels on a grayscale anatomical slice.
    """
    # Normalize base image to uint8 [0, 255]
    img_min, img_max = float(np.min(image_2d)), float(np.max(image_2d))
    if img_max > img_min:
        base_uint8 = ((image_2d - img_min) / (img_max - img_min) * 255.0).astype(np.uint8)
    else:
        base_uint8 = np.zeros_like(image_2d, dtype=np.uint8)

    base_rgb = np.stack([base_uint8] * 3, axis=-1).astype(np.float32)
    overlay_rgb = base_rgb.copy()

    # Blend class colors
    for class_id, color in CLASS_COLORS.items():
        if class_id == 0:
            continue
        class_pixels = (mask_2d == class_id)
        if np.any(class_pixels):
            color_arr = np.array(color, dtype=np.float32)
            overlay_rgb[class_pixels] = (1.0 - alpha) * base_rgb[class_pixels] + alpha * color_arr

    return Image.fromarray(np.clip(overlay_rgb, 0, 255).astype(np.uint8))


create_overlay_image = create_segmentation_overlay


def save_triplet_visualization(
    image_slice: np.ndarray,
    gt_slice: Optional[np.ndarray],
    pred_slice: np.ndarray,
    output_path: str | Path,
) -> None:
    """
    Assemble and save a side-by-side comparison:
    [Raw Image | Ground Truth Overlay | Predicted Overlay]
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    img_min, img_max = float(np.min(image_slice)), float(np.max(image_slice))
    if img_max > img_min:
        base_uint8 = ((image_slice - img_min) / (img_max - img_min) * 255.0).astype(np.uint8)
    else:
        base_uint8 = np.zeros_like(image_slice, dtype=np.uint8)
    raw_pil = Image.fromarray(base_uint8).convert("RGB")

    pred_overlay = create_segmentation_overlay(image_slice, pred_slice)
    
    if gt_slice is not None:
        gt_overlay = create_segmentation_overlay(image_slice, gt_slice)
        # Side-by-side combination
        w, h = raw_pil.size
        combo = Image.new("RGB", (w * 3, h))
        combo.paste(raw_pil, (0, 0))
        combo.paste(gt_overlay, (w, 0))
        combo.paste(pred_overlay, (w * 2, 0))
        combo.save(str(path))
    else:
        w, h = raw_pil.size
        combo = Image.new("RGB", (w * 2, h))
        combo.paste(raw_pil, (0, 0))
        combo.paste(pred_overlay, (w, 0))
        combo.save(str(path))
