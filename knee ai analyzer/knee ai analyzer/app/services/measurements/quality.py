"""
Quality Control and Validation Assessment for Knee Joint Measurements.
Evaluates mask continuity, component count, geometry bounds, and JSW sample sufficiency.
"""

from typing import Any, Dict, List, Tuple
from app.services.measurements.config import MeasurementConfig, default_measurement_config


def evaluate_measurement_quality(
    geometry_metrics: Dict[str, Any],
    jsw_metrics: Dict[str, Any],
    calibration_metrics: Dict[str, Any],
    config: MeasurementConfig = default_measurement_config,
) -> Dict[str, Any]:
    """
    Evaluate comprehensive measurement quality and assign clinical-safety quality status:
    - VALID: High-confidence, single dominant component, sound articulation geometry.
    - VALID_WITH_WARNING: Measurable but exhibits secondary satellite fragments or narrow profile.
    - INVALID: Empty mask, disconnected fragmentation, or implausible dimensions.

    Returns:
        Dict with 'status', 'quality_score', 'warnings', and 'checks'.
    """
    warnings: List[str] = []
    checks: Dict[str, bool] = {}

    fg_pixels = geometry_metrics.get("foreground_pixels", 0)
    area_pct = geometry_metrics.get("area_percentage", 0.0)
    num_components = geometry_metrics.get("component_count", 0)
    top2_ratio = geometry_metrics.get("top2_components_percentage", 0.0) / 100.0
    jsw_samples = jsw_metrics.get("sample_count", 0)

    # 1. Non-empty check
    non_empty = fg_pixels >= config.min_foreground_pixels_native
    checks["non_empty_foreground"] = non_empty
    if not non_empty:
        warnings.append(f"Insufficient foreground pixels ({fg_pixels} px < {config.min_foreground_pixels_native} px minimum).")

    # 2. Area plausible check
    area_plausible = config.min_area_percentage <= area_pct <= config.max_area_percentage
    checks["area_within_plausible_bounds"] = area_plausible
    if not area_plausible:
        warnings.append(f"Joint area percentage ({area_pct:.2f}%) is outside plausible anatomical bounds ({config.min_area_percentage}% - {config.max_area_percentage}%).")

    # 3. Component fragmentation check
    components_ok = num_components <= config.max_components_warning
    dominant_ok = top2_ratio >= config.min_dominant_components_ratio
    checks["dominant_compartments_intact"] = components_ok and dominant_ok
    if not components_ok:
        warnings.append(f"Multiple disconnected components detected ({num_components} components). Secondary fragments may affect boundary precision.")
    elif not dominant_ok:
        warnings.append(f"Dominant joint compartments represent only {top2_ratio*100:.1f}% of segmented joint mass (< {config.min_dominant_components_ratio*100:.0f}% target).")

    # 4. JSW sample sufficiency
    jsw_sufficient = jsw_samples >= config.min_jsw_samples
    checks["sufficient_jsw_samples"] = jsw_sufficient
    if not jsw_sufficient:
        warnings.append(f"Insufficient valid horizontal cross-sections for reliable JSW profiling ({jsw_samples} samples < {config.min_jsw_samples} minimum).")

    # Determine overall status
    if not non_empty or num_components > config.max_components_fail or jsw_samples == 0:
        overall_status = "INVALID"
        quality_score = 0.0
    elif len(warnings) > 0:
        overall_status = "VALID_WITH_WARNING"
        quality_score = max(0.40, 1.0 - (0.20 * len(warnings)))
    else:
        overall_status = "VALID"
        quality_score = 1.0

    return {
        "status": overall_status,
        "quality_score": round(quality_score, 2),
        "is_valid": overall_status in ("VALID", "VALID_WITH_WARNING"),
        "warnings": warnings,
        "checks": checks,
    }
