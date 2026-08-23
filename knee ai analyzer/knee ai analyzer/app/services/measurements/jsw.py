"""
Joint Space Width (JSW) Profiling in Native Radiograph Pixel Space.
Calculates localized vertical joint clearance across anatomical articulation columns.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import scipy.ndimage as ndi


def calculate_jsw_profile(
    native_mask: np.ndarray,
    min_samples: int = 10,
    margin_trim_ratio: float = 0.05,
) -> Dict[str, Any]:
    """
    Calculate a Joint Space Width (JSW) profile across the segmented native-space knee joint.
    
    Args:
        native_mask: 2D binary numpy array (H, W) where 1=knee_joint.
        min_samples: Minimum valid cross-sections required for a profile.
        margin_trim_ratio: Ratio of extreme lateral/medial fringe columns to trim to avoid corner artifacts.

    Returns:
        Dictionary containing JSW metrics (in pixels), percentiles, compartment division, and profile samples.
    """
    fg_mask = native_mask > 0
    if not np.any(fg_mask):
        return {
            "status": "no_foreground",
            "min_px": None,
            "median_px": None,
            "mean_px": None,
            "max_px": None,
            "std_px": None,
            "p10_px": None,
            "p25_px": None,
            "p75_px": None,
            "sample_count": 0,
            "profile_samples": [],
            "medial_lateral_ratio": None,
        }

    # Filter out only minor noise components (<5% of total foreground pixels)
    labeled, num_components = ndi.label(fg_mask)
    if num_components > 1:
        total_fg = np.sum(fg_mask)
        clean_mask = np.zeros_like(fg_mask)
        for c_id in range(1, num_components + 1):
            c_size = np.sum(labeled == c_id)
            if c_size / total_fg >= 0.05:
                clean_mask |= (labeled == c_id)
        if np.any(clean_mask):
            fg_mask = clean_mask

    cols = np.any(fg_mask, axis=0)
    col_indices = np.where(cols)[0]
    
    if len(col_indices) < min_samples:
        return {
            "status": "insufficient_samples",
            "min_px": None,
            "median_px": None,
            "mean_px": None,
            "max_px": None,
            "std_px": None,
            "p10_px": None,
            "p25_px": None,
            "p75_px": None,
            "sample_count": len(col_indices),
            "profile_samples": [],
            "medial_lateral_ratio": None,
        }

    # Trim extreme left/right margins to prevent boundary tangent spikes
    xmin = int(col_indices[0])
    xmax = int(col_indices[-1])
    span = xmax - xmin + 1
    trim_px = int(round(span * margin_trim_ratio))
    start_x = xmin + trim_px
    end_x = xmax - trim_px

    profile_samples: List[Dict[str, Any]] = []
    jsw_values: List[float] = []

    for x in range(start_x, end_x + 1):
        col_pixels = np.where(fg_mask[:, x])[0]
        if len(col_pixels) > 0:
            y_sup = int(col_pixels[0])
            y_inf = int(col_pixels[-1])
            # Vertical height in native pixels
            height_px = float(y_inf - y_sup + 1)
            jsw_values.append(height_px)
            profile_samples.append({
                "x": int(x),
                "y_superior": y_sup,
                "y_inferior": y_inf,
                "jsw_px": round(height_px, 2),
            })

    if len(jsw_values) < min_samples:
        return {
            "status": "insufficient_samples",
            "min_px": None,
            "median_px": None,
            "mean_px": None,
            "max_px": None,
            "std_px": None,
            "p10_px": None,
            "p25_px": None,
            "p75_px": None,
            "sample_count": len(jsw_values),
            "profile_samples": profile_samples,
            "medial_lateral_ratio": None,
        }

    jsw_arr = np.array(jsw_values, dtype=np.float32)

    # Statistics in native pixels
    min_px = float(np.min(jsw_arr))
    median_px = float(np.median(jsw_arr))
    mean_px = float(np.mean(jsw_arr))
    max_px = float(np.max(jsw_arr))
    std_px = float(np.std(jsw_arr))
    p10_px = float(np.percentile(jsw_arr, 10))
    p25_px = float(np.percentile(jsw_arr, 25))
    p75_px = float(np.percentile(jsw_arr, 75))

    # Compartment Asymmetry (Left Half vs Right Half of joint space)
    half_len = len(jsw_values) // 2
    left_half_mean = float(np.mean(jsw_arr[:half_len])) if half_len > 0 else mean_px
    right_half_mean = float(np.mean(jsw_arr[half_len:])) if half_len > 0 else mean_px
    
    # Asymmetry ratio (relative difference)
    asymmetry_ratio = round(abs(left_half_mean - right_half_mean) / max(mean_px, 1e-4), 4)

    return {
        "status": "valid",
        "min_px": round(min_px, 2),
        "median_px": round(median_px, 2),
        "mean_px": round(mean_px, 2),
        "max_px": round(max_px, 2),
        "std_px": round(std_px, 2),
        "p10_px": round(p10_px, 2),
        "p25_px": round(p25_px, 2),
        "p75_px": round(p75_px, 2),
        "sample_count": len(jsw_values),
        "compartment_left_mean_px": round(left_half_mean, 2),
        "compartment_right_mean_px": round(right_half_mean, 2),
        "compartment_asymmetry_ratio": asymmetry_ratio,
        "profile_samples": profile_samples,
    }
