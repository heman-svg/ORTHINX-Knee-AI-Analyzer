"""
Pydantic Schemas for Stage 11 Research Knee Assessment & Structured Reporting.
Strictly research/decision-support definitions without clinical diagnosis or OA grading.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ScanInfoSchema(BaseModel):
    scan_id: Optional[int] = None
    filename: str
    native_dimensions: Dict[str, int]


class SegmentationAssessmentSchema(BaseModel):
    model: str = "best_model_v2.pth"
    model_version: str = "v2"
    segmentation_quality: str = Field(
        ..., description="HIGH, MODERATE, LOW, or INVALID based on component mass and continuity"
    )
    foreground_pixels: int
    area_percentage: float
    component_count: int
    dominant_component_ratio: float
    top2_components_ratio: float


class JswProfileAssessmentSchema(BaseModel):
    min_px: Optional[float] = None
    median_px: Optional[float] = None
    mean_px: Optional[float] = None
    max_px: Optional[float] = None
    std_px: Optional[float] = None
    p10_px: Optional[float] = None
    p25_px: Optional[float] = None
    p75_px: Optional[float] = None
    sample_count: int
    compartment_asymmetry_ratio: Optional[float] = None
    measurement_status: str


class CalibrationAssessmentSchema(BaseModel):
    calibration_available: bool = False
    pixel_spacing_mm: Optional[float] = None
    physical_measurements_available: bool = False
    unit: str = "pixels"
    calibration_notice: str
    jsw_mm: Optional[Dict[str, Optional[float]]] = None


class QualityControlAssessmentSchema(BaseModel):
    quality_status: str = Field(..., description="VALID, VALID_WITH_WARNING, or INVALID")
    warning_reasons: List[str] = Field(default_factory=list)
    invalid_reasons: List[str] = Field(default_factory=list)
    component_integrity: str


class ResearchObservationsSchema(BaseModel):
    measurement_reliability_score: float = Field(
        ..., description="0.00 to 1.00 score quantifying mathematical and geometric reliability"
    )
    observations: List[str] = Field(default_factory=list)
    clinical_notice: str = "RESEARCH / PROTOTYPE — NOT FOR CLINICAL DIAGNOSIS"


class StructuredResearchAssessmentResponse(BaseModel):
    status: str = "completed"
    scan_info: ScanInfoSchema
    segmentation: SegmentationAssessmentSchema
    jsw_profile: JswProfileAssessmentSchema
    calibration: CalibrationAssessmentSchema
    quality_control: QualityControlAssessmentSchema
    research_assessment: ResearchObservationsSchema
    safety_notice: Dict[str, str] = Field(
        default_factory=lambda: {
            "prototype_statement": "RESEARCH / PROTOTYPE ONLY",
            "clinical_diagnosis": "Not a clinical diagnosis",
            "osteoarthritis_grading": "No OA grade claimed or assigned",
            "treatment_recommendation": "No treatment recommendation provided",
            "surgical_recommendation": "No surgical recommendation provided",
        }
    )
    visualization_path: Optional[str] = None
    visualization_url: Optional[str] = None
    processing_time_ms: Optional[float] = None
