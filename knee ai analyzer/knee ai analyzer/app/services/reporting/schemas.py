"""
Pydantic Schemas for Stage 12 End-to-End Knee Analysis Report & Structured Exports.
Defines patient info, image info, model metadata, segmentation metrics, geometry,
JSW profiling, calibration status, QC flags, reliability score, and safety statements.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PatientScanInfo(BaseModel):
    patient_id: Optional[int] = None
    patient_code: Optional[str] = None
    scan_id: Optional[int] = None
    filename: str
    uploaded_at: Optional[str] = None


class ImageInformation(BaseModel):
    native_width: int
    native_height: int
    channels: int = 1
    file_format: str
    file_size_bytes: Optional[int] = None


class ModelInformation(BaseModel):
    name: str = "MONAI 2D U-Net"
    checkpoint: str = "best_model_v2.pth"
    version: str = "v2"
    spatial_dimensions: int = 2
    in_channels: int = 1
    out_channels: int = 2
    training_resolution: str = "512x512 (Aspect-ratio preserving letterbox)"


class SegmentationSummary(BaseModel):
    quality: str = Field(..., description="HIGH, MODERATE, LOW, or INVALID")
    foreground_pixels: int
    area_percentage: float
    component_count: int
    dominant_component_ratio: float
    top2_components_ratio: float
    dice_score: Optional[float] = None
    iou_score: Optional[float] = None


class GeometrySummary(BaseModel):
    bounding_box: Optional[Dict[str, int]] = None
    centroid: Optional[Dict[str, float]] = None
    status: str = "extracted"


class JswMeasurementsSummary(BaseModel):
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
    unit: str = "pixels"


class CalibrationSummary(BaseModel):
    available: bool = False
    pixel_spacing_mm: Optional[float] = None
    unit: str = "pixels"
    notice: str = "Physical millimeter measurement unavailable because verified pixel-spacing metadata was not provided."
    jsw_mm: Optional[Dict[str, Optional[float]]] = None


class QualityControlSummary(BaseModel):
    status: str = Field(..., description="VALID, VALID_WITH_WARNING, or INVALID")
    is_valid: bool
    warning_reasons: List[str] = Field(default_factory=list)
    invalid_reasons: List[str] = Field(default_factory=list)
    component_integrity: str


class ResearchAssessmentSummary(BaseModel):
    measurement_reliability_score: float = Field(
        ..., description="0.00 to 1.00 score quantifying mathematical and geometric stability"
    )
    observations: List[str] = Field(default_factory=list)
    clinical_disclaimer: str = "RESEARCH / PROTOTYPE — NOT FOR CLINICAL DIAGNOSIS"


class ProcessingSummary(BaseModel):
    processing_time_ms: float
    timestamp: str
    device: str = "CPU"


class KneeAnalysisReport(BaseModel):
    title: str = "KneeAI Analyzer — Research Knee Analysis Report"
    report_id: str
    generated_at: str
    status: str = "completed"
    patient_scan_info: PatientScanInfo
    image_information: ImageInformation
    model_information: ModelInformation
    segmentation: SegmentationSummary
    geometry: GeometrySummary
    jsw_measurements: JswMeasurementsSummary
    calibration: CalibrationSummary
    quality_control: QualityControlSummary
    research_assessment: ResearchAssessmentSummary
    processing: ProcessingSummary
    safety_notice: Dict[str, str] = Field(
        default_factory=lambda: {
            "prototype_statement": "RESEARCH / PROTOTYPE OUTPUT ONLY",
            "clinical_diagnosis": "Not a clinical diagnosis",
            "osteoarthritis_classification": "No osteoarthritis grade claimed or assigned",
            "treatment_recommendation": "No treatment recommendation provided",
            "surgical_recommendation": "No surgical decision or implant sizing provided",
            "disclaimer_text": "The KneeAI Analyzer is a research and decision-support prototype. It is not a clinically validated diagnostic system. Results must not be used as a substitute for qualified medical assessment.",
        }
    )
    visualization_path: Optional[str] = None
    visualization_url: Optional[str] = None
    pdf_report_path: Optional[str] = None
    pdf_report_url: Optional[str] = None
    json_report_path: Optional[str] = None
    json_report_url: Optional[str] = None
