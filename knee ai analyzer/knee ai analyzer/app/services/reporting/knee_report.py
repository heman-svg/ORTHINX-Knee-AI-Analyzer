"""
End-to-End Knee Analysis Report Service.
Orchestrates preprocessing, V2 segmentation, native geometry extraction, JSW profiling,
QC evaluation, research assessment, structured JSON report assembly, visual card generation,
and PDF document compilation.
"""

import datetime
import json
from pathlib import Path
from typing import Any, Dict, Optional
import numpy as np
import torch
from sqlalchemy.orm import Session

from app.models.scan import Scan
from app.services.preprocessing.loader import load_medical_image
from app.services.measurements.pipeline import run_knee_measurement_pipeline
from app.services.assessment.engine import generate_research_assessment
from app.services.assessment.visualization import render_assessment_visual_report
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


def generate_complete_knee_report(
    raw_image_array: np.ndarray,
    filename: str = "radiograph.png",
    scan_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    patient_code: Optional[str] = None,
    pixel_spacing: Optional[list] = None,
    gt_mask_array: Optional[np.ndarray] = None,
    output_dir: Optional[Path] = None,
    generate_pdf: bool = True,
    device: str = "CPU",
) -> KneeAnalysisReport:
    """
    Execute full end-to-end analysis and assemble a comprehensive KneeAnalysisReport object.
    """
    t_start = datetime.datetime.utcnow()

    # Step 1: Run Stage 9 & 10 Native Measurement Pipeline
    meas_result = run_knee_measurement_pipeline(
        raw_image_array=raw_image_array,
        pixel_spacing=pixel_spacing,
        save_visualization=False,
    )

    orig_h = meas_result["native_dimensions"]["height"]
    orig_w = meas_result["native_dimensions"]["width"]

    seg_metrics = meas_result["segmentation"]
    jsw_metrics = meas_result["jsw"]
    cal_metrics = meas_result["calibration"]
    qc_metrics = meas_result["quality"]
    proc_time_ms = meas_result["processing_time_ms"]

    # Optional Dice / IoU if ground truth mask provided
    dice_score = None
    iou_score = None
    if gt_mask_array is not None:
        # Reconstruct native mask from samples or pipeline
        pred_mask_unpadded = np.zeros((orig_h, orig_w), dtype=np.uint8)
        samples = jsw_metrics.get("profile_samples", [])
        for s in samples:
            x = s["x"]
            y1 = s["y_superior"]
            y2 = s["y_inferior"]
            pred_mask_unpadded[y1:y2+1, x] = 1

        intersection = int(np.sum((pred_mask_unpadded == 1) & (gt_mask_array == 1)))
        union = int(np.sum((pred_mask_unpadded == 1) | (gt_mask_array == 1)))
        sum_fg = int(np.sum(pred_mask_unpadded == 1) + np.sum(gt_mask_array == 1))
        dice_score = round(float((2.0 * intersection) / max(sum_fg, 1)), 4)
        iou_score = round(float(intersection / max(union, 1)), 4)

    # Step 2: Generate Research Assessment
    assess_resp = generate_research_assessment(
        scan_id=scan_id,
        filename=filename,
        native_dimensions={"height": orig_h, "width": orig_w},
        seg_metrics=seg_metrics,
        jsw_metrics=jsw_metrics,
        cal_metrics=cal_metrics,
        qc_metrics=qc_metrics,
        processing_time_ms=proc_time_ms,
    )

    # Output paths setup
    report_id = f"RPT-{scan_id or 'EVAL'}-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    base_out = output_dir or Path("static") / "reports"
    base_out.mkdir(parents=True, exist_ok=True)

    vis_file = base_out / f"card_{scan_id or 'eval'}_{Path(filename).stem}.png"
    pdf_file = base_out / f"report_{scan_id or 'eval'}_{Path(filename).stem}.pdf"
    json_file = base_out / f"report_{scan_id or 'eval'}_{Path(filename).stem}.json"

    # Step 3: Render Diagnostic Visual Report Card
    pred_mask_unpadded = np.zeros((orig_h, orig_w), dtype=np.uint8)
    samples = jsw_metrics.get("profile_samples", [])
    for s in samples:
        x = s["x"]
        y1 = s["y_superior"]
        y2 = s["y_inferior"]
        pred_mask_unpadded[y1:y2+1, x] = 1

    render_assessment_visual_report(
        raw_image=raw_image_array,
        pred_mask=pred_mask_unpadded,
        jsw_metrics=jsw_metrics,
        seg_metrics=seg_metrics,
        cal_metrics=cal_metrics,
        qc_metrics=qc_metrics,
        reliability_score=assess_resp.research_assessment.measurement_reliability_score,
        scan_id=scan_id,
        filename=filename,
        output_path=vis_file,
    )

    # Step 4: Assemble Structured Pydantic Report
    report = KneeAnalysisReport(
        report_id=report_id,
        generated_at=datetime.datetime.utcnow().isoformat(),
        status="completed",
        patient_scan_info=PatientScanInfo(
            patient_id=patient_id,
            patient_code=patient_code or f"PAT-{patient_id or 'N/A'}",
            scan_id=scan_id,
            filename=filename,
            uploaded_at=datetime.datetime.utcnow().isoformat(),
        ),
        image_information=ImageInformation(
            native_width=orig_w,
            native_height=orig_h,
            channels=1,
            file_format=Path(filename).suffix.lstrip(".").upper() or "PNG",
        ),
        model_information=ModelInformation(),
        segmentation=SegmentationSummary(
            quality=assess_resp.segmentation.segmentation_quality,
            foreground_pixels=seg_metrics.get("foreground_pixels", 0),
            area_percentage=seg_metrics.get("area_percentage", 0.0),
            component_count=seg_metrics.get("component_count", 0),
            dominant_component_ratio=assess_resp.segmentation.dominant_component_ratio,
            top2_components_ratio=assess_resp.segmentation.top2_components_ratio,
            dice_score=dice_score,
            iou_score=iou_score,
        ),
        geometry=GeometrySummary(
            bounding_box=seg_metrics.get("bounding_box"),
            centroid=seg_metrics.get("centroid"),
            status=seg_metrics.get("status", "extracted"),
        ),
        jsw_measurements=JswMeasurementsSummary(
            min_px=jsw_metrics.get("min_px"),
            median_px=jsw_metrics.get("median_px"),
            mean_px=jsw_metrics.get("mean_px"),
            max_px=jsw_metrics.get("max_px"),
            std_px=jsw_metrics.get("std_px"),
            p10_px=jsw_metrics.get("p10_px"),
            p25_px=jsw_metrics.get("p25_px"),
            p75_px=jsw_metrics.get("p75_px"),
            sample_count=jsw_metrics.get("sample_count", 0),
            compartment_asymmetry_ratio=jsw_metrics.get("compartment_asymmetry_ratio"),
            unit="pixels",
        ),
        calibration=CalibrationSummary(
            available=cal_metrics.get("available", False),
            pixel_spacing_mm=cal_metrics.get("pixel_spacing_mm"),
            unit=cal_metrics.get("unit", "pixels"),
            notice=cal_metrics.get("notice", "Uncalibrated"),
            jsw_mm=cal_metrics.get("jsw_mm"),
        ),
        quality_control=QualityControlSummary(
            status=qc_metrics.get("status", "INVALID"),
            is_valid=qc_metrics.get("is_valid", False),
            warning_reasons=assess_resp.quality_control.warning_reasons,
            invalid_reasons=assess_resp.quality_control.invalid_reasons,
            component_integrity=assess_resp.quality_control.component_integrity,
        ),
        research_assessment=ResearchAssessmentSummary(
            measurement_reliability_score=assess_resp.research_assessment.measurement_reliability_score,
            observations=assess_resp.research_assessment.observations,
            clinical_disclaimer="RESEARCH / PROTOTYPE — NOT FOR CLINICAL DIAGNOSIS",
        ),
        processing=ProcessingSummary(
            processing_time_ms=proc_time_ms,
            timestamp=datetime.datetime.utcnow().isoformat(),
            device=device,
        ),
        visualization_path=str(vis_file.resolve()),
        visualization_url=f"/static/reports/{vis_file.name}",
        json_report_path=str(json_file.resolve()),
        json_report_url=f"/static/reports/{json_file.name}",
    )

    # Step 5: Generate PDF Document
    if generate_pdf:
        generate_pdf_report(
            report_dict=report.model_dump(),
            output_pdf_path=pdf_file,
            image_card_path=vis_file,
        )
        report.pdf_report_path = str(pdf_file.resolve())
        report.pdf_report_url = f"/static/reports/{pdf_file.name}"

    # Step 6: Save JSON Export
    with open(json_file, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    return report


def get_or_create_scan_report(
    scan_id: int,
    db: Session,
    force_regenerate: bool = False,
) -> KneeAnalysisReport:
    """
    Database entrypoint: load scan, run report generation, and return KneeAnalysisReport.
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise LookupError(f"Scan with ID {scan_id} not found.")

    target_path = scan.preprocessed_path or scan.file_path
    if not target_path or not Path(target_path).exists():
        raise FileNotFoundError(f"Scan image file not found on disk: {target_path}")

    fname = getattr(scan, "original_filename", "radiograph.png")
    output_dir = Path("static") / "reports"
    output_dir.mkdir(parents=True, exist_ok=True)

    json_file = output_dir / f"report_{scan.id}_{Path(fname).stem}.json"
    if not force_regenerate and json_file.exists():
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                return KneeAnalysisReport.model_validate_json(f.read())
        except Exception:
            pass  # regenerate if corrupt

    img_data = load_medical_image(Path(target_path))
    raw_array = img_data.data.astype(np.float32)

    pixel_spacing = img_data.spacing if img_data.spacing is not None else None
    patient_code = scan.patient.patient_code if scan.patient else f"PAT-{scan.patient_id}"

    report = generate_complete_knee_report(
        raw_image_array=raw_array,
        filename=fname,
        scan_id=scan.id,
        patient_id=scan.patient_id,
        patient_code=patient_code,
        pixel_spacing=pixel_spacing,
        output_dir=output_dir,
        generate_pdf=True,
    )

    return report

