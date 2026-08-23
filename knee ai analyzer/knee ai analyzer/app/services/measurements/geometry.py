"""
Geometric feature extraction and component analysis for native-space knee joint masks.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import scipy.ndimage as ndi


def extract_native_geometry(
    native_mask: np.ndarray,
    min_pixels: int = 100,
) -> Dict[str, Any]:
    """
    Extract anatomical geometry and connected component properties from a native-resolution binary mask.
    
    Args:
        native_mask: 2D binary numpy array (H, W) where 1=knee_joint, 0=background.
        min_pixels: Minimum foreground pixels before considering mask empty.

    Returns:
        Dictionary of geometric properties.
    """
    h, w = native_mask.shape[:2]
    total_pixels = int(h * w)
    fg_mask = native_mask > 0
    fg_pixels = int(np.sum(fg_mask))

    if fg_pixels == 0 or fg_pixels < min_pixels:
        return {
            "foreground_pixels": fg_pixels,
            "total_pixels": total_pixels,
            "area_percentage": 0.0,
            "bounding_box": None,
            "centroid": None,
            "component_count": 0,
            "largest_component_pixels": 0,
            "largest_component_percentage": 0.0,
            "components_summary": [],
            "status": "empty_or_too_small",
        }

    area_pct = round(float((fg_pixels / total_pixels) * 100.0), 4)

    # Bounding Box
    rows = np.any(fg_mask, axis=1)
    cols = np.any(fg_mask, axis=0)
    ymin, ymax = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    xmin, xmax = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
    bbox_w = xmax - xmin + 1
    bbox_h = ymax - ymin + 1

    # Centroid (Center of Mass in native space)
    cy, cx = ndi.center_of_mass(fg_mask.astype(np.float32))
    centroid = {
        "x": round(float(cx), 2),
        "y": round(float(cy), 2),
    }

    # Connected Components
    labeled, num_components = ndi.label(fg_mask)
    components_info = []
    for c_id in range(1, num_components + 1):
        c_size = int(np.sum(labeled == c_id))
        c_pct = round(float((c_size / fg_pixels) * 100.0), 2)
        components_info.append({"component_id": c_id, "pixel_count": c_size, "percentage_of_fg": c_pct})

    # Sort components by size descending
    components_info.sort(key=lambda x: x["pixel_count"], reverse=True)
    largest_comp_size = components_info[0]["pixel_count"] if components_info else 0
    largest_comp_pct = components_info[0]["percentage_of_fg"] if components_info else 0.0
    top2_size = sum(c["pixel_count"] for c in components_info[:2]) if components_info else 0
    top2_pct = round(float((top2_size / fg_pixels) * 100.0), 2) if fg_pixels > 0 else 0.0

    return {
        "foreground_pixels": fg_pixels,
        "total_pixels": total_pixels,
        "area_percentage": area_pct,
        "bounding_box": {
            "x_min": xmin,
            "y_min": ymin,
            "x_max": xmax,
            "y_max": ymax,
            "width": bbox_w,
            "height": bbox_h,
        },
        "centroid": centroid,
        "component_count": int(num_components),
        "largest_component_pixels": largest_comp_size,
        "largest_component_percentage": largest_comp_pct,
        "top2_components_percentage": top2_pct,
        "components_summary": components_info,
        "status": "valid",
    }
