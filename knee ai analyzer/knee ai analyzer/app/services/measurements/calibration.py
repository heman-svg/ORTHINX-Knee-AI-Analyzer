"""
Pixel-to-Millimeter Physical Calibration Abstraction.
Converts native pixel distances to millimeters ONLY when valid physical pixel spacing is present.
"""

from typing import Any, Dict, List, Optional


def apply_physical_calibration(
    jsw_metrics: Dict[str, Any],
    pixel_spacing: Optional[List[float]] = None,
) -> Dict[str, Any]:
    """
    Apply physical millimeter calibration to native pixel measurements if pixel spacing is provided.
    
    Args:
        jsw_metrics: Dictionary containing 'min_px', 'median_px', 'mean_px', 'max_px', 'std_px', etc.
        pixel_spacing: Physical spacing in mm per pixel [sx, sy] or [sx, sy, sz].

    Returns:
        Calibration metadata dict and millimeter-scaled metrics if available.
    """
    # Validate pixel spacing
    valid_spacing = False
    spacing_mm = None

    if pixel_spacing is not None and len(pixel_spacing) >= 2:
        try:
            sx = float(pixel_spacing[0])
            sy = float(pixel_spacing[1])
            if sx > 0.0 and sy > 0.0:
                spacing_mm = float(sy)
                valid_spacing = True
        except (ValueError, TypeError):
            valid_spacing = False

    if not valid_spacing or spacing_mm is None:
        return {
            "available": False,
            "pixel_spacing_mm": None,
            "unit": "pixels",
            "notice": "JSW available in pixels; physical mm conversion requires calibrated radiographic pixel spacing (e.g. DICOM ImagerPixelSpacing tags).",
            "jsw_mm": {
                "min_mm": None,
                "median_mm": None,
                "mean_mm": None,
                "max_mm": None,
                "std_mm": None,
                "p10_mm": None,
                "p25_mm": None,
                "p75_mm": None,
            },
        }

    # If valid spacing exists, scale all pixel measurements
    def scale_val(val_px):
        return round(float(val_px * spacing_mm), 3) if val_px is not None else None

    return {
        "available": True,
        "pixel_spacing_mm": round(spacing_mm, 4),
        "unit": "millimeters",
        "notice": "Calibrated physical millimeter measurements computed from verified medical pixel spacing.",
        "jsw_mm": {
            "min_mm": scale_val(jsw_metrics.get("min_px")),
            "median_mm": scale_val(jsw_metrics.get("median_px")),
            "mean_mm": scale_val(jsw_metrics.get("mean_px")),
            "max_mm": scale_val(jsw_metrics.get("max_px")),
            "std_mm": scale_val(jsw_metrics.get("std_px")),
            "p10_mm": scale_val(jsw_metrics.get("p10_px")),
            "p25_mm": scale_val(jsw_metrics.get("p25_px")),
            "p75_mm": scale_val(jsw_metrics.get("p75_px")),
        },
    }
