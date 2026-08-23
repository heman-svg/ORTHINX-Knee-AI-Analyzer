"""
Pipeline Orchestrator for Stage 11 Research Knee Assessment.
Connects V2 segmentation, native measurement extraction, assessment scoring, and visualization rendering.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Union
import numpy as np
import torch
from PIL import Image
from sqlalchemy.orm import Session

from app.models.scan import Scan
from app.services.measurements.pipeline import run_knee_measurement_pipeline
from app.services.assessment.engine import generate_research_assessment
from app.services.assessment.visualization import render_assessment_visual_report
from app.services.assessment.schemas import StructuredResearchAssessmentResponse


def run_research_assessment_pipeline(
    raw_image_array: np.ndarray,
    filename: str = "radiograph.png",
    scan_id: Optional[int] = None,
    pixel_spacing: Optional[list] = None,
    output_dir: Optional[Path] = None,
    save_visualization: bool = True,
) -> Dict[str, Any]:
    """
    Run full end-to-end research assessment on a raw image array.
    """
    # Run Stage 9 & 10 Measurement Pipeline
    meas_result = run_knee_measurement_pipeline(
        raw_image_array=raw_image_array,
        pixel_spacing=pixel_spacing,
        output_dir=output_dir,
        save_visualization=False,
    )

    orig_h = meas_result["native_dimensions"]["height"]
    orig_w = meas_result["native_dimensions"]["width"]

    seg_metrics = meas_result["segmentation"]
    jsw_metrics = meas_result["jsw"]
    cal_metrics = meas_result["calibration"]
    qc_metrics = meas_result["quality"]
    processing_time_ms = meas_result["processing_time_ms"]

    vis_path_str = None
    vis_url_str = None

    # Compute Assessment Response
    assessment_response = generate_research_assessment(
        scan_id=scan_id,
        filename=filename,
        native_dimensions={"height": orig_h, "width": orig_w},
        seg_metrics=seg_metrics,
        jsw_metrics=jsw_metrics,
        cal_metrics=cal_metrics,
        qc_metrics=qc_metrics,
        processing_time_ms=processing_time_ms,
    )

    if save_visualization and output_dir is not None:
        vis_file = output_dir / f"assessment_{scan_id or 'eval'}_{Path(filename).stem}.png"
        
        # We need the predicted mask to render overlay
        # Bounding box / sample reconstruction or extract from model
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
            reliability_score=assessment_response.research_assessment.measurement_reliability_score,
            scan_id=scan_id,
            filename=filename,
            output_path=vis_file,
        )
        vis_path_str = str(vis_file)
        if scan_id is not None:
            vis_url_str = f"/static/assessments/assessment_{scan_id}_{Path(filename).stem}.png"

    assessment_response.visualization_path = vis_path_str
    assessment_response.visualization_url = vis_url_str

    return assessment_response.model_dump()


def run_assessment_for_scan_db(
    scan: Scan,
    db: Session,
) -> Dict[str, Any]:
    """
    Load raw scan file from database record, execute research assessment, and return result.
    """
    target_path = scan.preprocessed_path or scan.file_path
    if not target_path or not Path(target_path).exists():
        raise FileNotFoundError(f"Image file for Scan ID {scan.id} not found on disk: {target_path}")

    from app.services.preprocessing.loader import load_medical_image
    img_data = load_medical_image(Path(target_path))
    raw_arr = img_data.data.astype(np.float32)

    pixel_spacing = img_data.spacing if img_data.spacing is not None else None

    output_dir = Path("static") / "assessments"
    output_dir.mkdir(parents=True, exist_ok=True)

    fname = getattr(scan, "original_filename", "radiograph.png")

    assessment_dict = run_research_assessment_pipeline(
        raw_image_array=raw_arr,
        filename=fname,
        scan_id=scan.id,
        pixel_spacing=pixel_spacing,
        output_dir=output_dir,
        save_visualization=True,
    )

    return assessment_dict

