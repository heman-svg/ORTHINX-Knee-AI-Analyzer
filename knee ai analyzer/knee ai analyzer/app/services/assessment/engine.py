"""
Research Assessment Engine for Stage 11 Knee Assessment & Structured Reporting.
Evaluates segmentation quality, measurement validity, JSW profiles, and calculates
a transparent Measurement Reliability Score.
"""

from typing import Any, Dict, List, Optional
from app.services.assessment.schemas import (
    ScanInfoSchema,
    SegmentationAssessmentSchema,
    JswProfileAssessmentSchema,
    CalibrationAssessmentSchema,
    QualityControlAssessmentSchema,
    ResearchObservationsSchema,
    StructuredResearchAssessmentResponse,
)


def compute_measurement_reliability_score(
    seg_metrics: Dict[str, Any],
    jsw_metrics: Dict[str, Any],
    cal_metrics: Dict[str, Any],
    qc_metrics: Dict[str, Any],
) -> float:
    """
    Compute a transparent, deterministic Measurement Reliability Score (0.00 to 1.00).
    Quantifies computational stability, component continuity, and profile completeness.
    
    Formula:
    - INVALID status -> 0.00
    - VALID status -> Base 1.00
    - VALID_WITH_WARNING status -> Base 0.75 - (0.10 * len(warnings))
    - Component fragmentation penalty: if top2_ratio < 0.85, penalize linearly
    - Sample count penalty: if sample_count < 50, scale proportionally
    - Calibration bonus: +0.05 if verified physical calibration is available
    - Clamped strictly to [0.00, 1.00]
    """
    status = qc_metrics.get("status", "INVALID")
    if status == "INVALID":
        return 0.00

    warnings = qc_metrics.get("warnings", [])
    if status == "VALID_WITH_WARNING":
        base_score = max(0.40, 0.75 - (0.10 * len(warnings)))
    else:
        base_score = 1.00

    # Top-2 component continuity penalty
    top2_pct = seg_metrics.get("top2_components_percentage", 100.0) / 100.0
    if top2_pct < 0.85:
        base_score -= (0.85 - top2_pct) * 0.40

    # Sample completeness penalty
    samples = jsw_metrics.get("sample_count", 0)
    if samples < 50:
        base_score *= max(0.50, samples / 50.0)

    # Optional calibration boost
    if cal_metrics.get("available", False):
        base_score = min(1.00, base_score + 0.05)

    return round(float(max(0.00, min(1.00, base_score))), 2)


def generate_research_assessment(
    scan_id: Optional[int],
    filename: str,
    native_dimensions: Dict[str, int],
    seg_metrics: Dict[str, Any],
    jsw_metrics: Dict[str, Any],
    cal_metrics: Dict[str, Any],
    qc_metrics: Dict[str, Any],
    processing_time_ms: Optional[float] = None,
    visualization_path: Optional[str] = None,
    visualization_url: Optional[str] = None,
) -> StructuredResearchAssessmentResponse:
    """
    Assemble the complete structured research assessment object without clinical claims.
    """
    # 1. Segmentation Quality Category
    fg_px = seg_metrics.get("foreground_pixels", 0)
    comp_ct = seg_metrics.get("component_count", 0)
    largest_pct = seg_metrics.get("largest_component_percentage", 0.0) / 100.0
    top2_pct = seg_metrics.get("top2_components_percentage", 0.0) / 100.0

    if fg_px == 0:
        seg_quality = "INVALID"
    elif top2_pct >= 0.85 and comp_ct <= 2:
        seg_quality = "HIGH"
    elif top2_pct >= 0.70 and comp_ct <= 4:
        seg_quality = "MODERATE"
    elif top2_pct < 0.70 or comp_ct > 4:
        seg_quality = "LOW"
    else:
        seg_quality = "MODERATE"

    # 2. Quality Control & Reasons
    status = qc_metrics.get("status", "INVALID")
    warnings = qc_metrics.get("warnings", [])
    invalid_reasons = warnings if status == "INVALID" else []
    warning_reasons = warnings if status == "VALID_WITH_WARNING" else []

    if comp_ct == 1:
        comp_integrity = "Continuous Single Articulation Region (100% mass)"
    elif comp_ct == 2:
        comp_integrity = f"Bicompartmental Symmetrical Region ({top2_pct*100:.1f}% mass in 2 dominant lobes)"
    else:
        comp_integrity = f"Multi-Component Segmented Region ({comp_ct} components, Top-2: {top2_pct*100:.1f}% mass)"

    # 3. Measurement Reliability Score
    reliability_score = compute_measurement_reliability_score(
        seg_metrics=seg_metrics,
        jsw_metrics=jsw_metrics,
        cal_metrics=cal_metrics,
        qc_metrics=qc_metrics,
    )

    # 4. Research Observations (Strictly Non-Diagnostic)
    observations: List[str] = []
    med_px = jsw_metrics.get("median_px")
    min_px = jsw_metrics.get("min_px")
    max_px = jsw_metrics.get("max_px")
    asym = jsw_metrics.get("compartment_asymmetry_ratio")

    if status == "INVALID":
        observations.append("Measurement quality is INVALID; automated JSW metrics should not be utilized.")
    else:
        observations.append(
            f"Joint articulation successfully profiled across {jsw_metrics.get('sample_count', 0)} column cross-sections."
        )
        if med_px is not None and min_px is not None:
            observations.append(
                f"Native clearance profile spans from {min_px} px (minimum) to {max_px} px (maximum) with median {med_px} px."
            )
        if asym is not None:
            observations.append(
                f"Medial/lateral clearance asymmetry ratio measured at {asym:.4f} in native pixel space."
            )
        if not cal_metrics.get("available", False):
            observations.append(
                "Physical millimeter conversion unavailable (radiograph lacks verified medical pixel-spacing tags)."
            )

    return StructuredResearchAssessmentResponse(
        status="completed",
        scan_info=ScanInfoSchema(
            scan_id=scan_id,
            filename=filename,
            native_dimensions=native_dimensions,
        ),
        segmentation=SegmentationAssessmentSchema(
            model="best_model_v2.pth",
            model_version="v2",
            segmentation_quality=seg_quality,
            foreground_pixels=fg_px,
            area_percentage=seg_metrics.get("area_percentage", 0.0),
            component_count=comp_ct,
            dominant_component_ratio=round(largest_pct, 4),
            top2_components_ratio=round(top2_pct, 4),
        ),
        jsw_profile=JswProfileAssessmentSchema(
            min_px=min_px,
            median_px=med_px,
            mean_px=jsw_metrics.get("mean_px"),
            max_px=max_px,
            std_px=jsw_metrics.get("std_px"),
            p10_px=jsw_metrics.get("p10_px"),
            p25_px=jsw_metrics.get("p25_px"),
            p75_px=jsw_metrics.get("p75_px"),
            sample_count=jsw_metrics.get("sample_count", 0),
            compartment_asymmetry_ratio=asym,
            measurement_status=jsw_metrics.get("status", "unknown"),
        ),
        calibration=CalibrationAssessmentSchema(
            calibration_available=cal_metrics.get("available", False),
            pixel_spacing_mm=cal_metrics.get("pixel_spacing_mm"),
            physical_measurements_available=cal_metrics.get("available", False),
            unit=cal_metrics.get("unit", "pixels"),
            calibration_notice=cal_metrics.get("notice", "Uncalibrated"),
            jsw_mm=cal_metrics.get("jsw_mm"),
        ),
        quality_control=QualityControlAssessmentSchema(
            quality_status=status,
            warning_reasons=warning_reasons,
            invalid_reasons=invalid_reasons,
            component_integrity=comp_integrity,
        ),
        research_assessment=ResearchObservationsSchema(
            measurement_reliability_score=reliability_score,
            observations=observations,
            clinical_notice="RESEARCH / PROTOTYPE — NOT FOR CLINICAL DIAGNOSIS",
        ),
        visualization_path=visualization_path,
        visualization_url=visualization_url,
        processing_time_ms=processing_time_ms,
    )
