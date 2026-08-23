"""
Stage 12 Reporting Package: End-to-End Knee Analysis Reports, JSON & PDF Exports.
"""

from app.services.reporting.schemas import (
    PatientScanInfo,
    ImageInformation,
    ModelInformation,
    SegmentationSummary,
    GeometrySummary,
    JswMeasurementsSummary,
    CalibrationSummary,
    QualityControlSummary,
    ResearchAssessmentSummary,
    ProcessingSummary,
    KneeAnalysisReport,
)
from app.services.reporting.pdf_report import generate_pdf_report
from app.services.reporting.knee_report import (
    generate_complete_knee_report,
    get_or_create_scan_report,
)

__all__ = [
    "PatientScanInfo",
    "ImageInformation",
    "ModelInformation",
    "SegmentationSummary",
    "GeometrySummary",
    "JswMeasurementsSummary",
    "CalibrationSummary",
    "QualityControlSummary",
    "ResearchAssessmentSummary",
    "ProcessingSummary",
    "KneeAnalysisReport",
    "generate_pdf_report",
    "generate_complete_knee_report",
    "get_or_create_scan_report",
]
