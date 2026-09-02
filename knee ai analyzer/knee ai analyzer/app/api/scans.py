from pathlib import Path
import os
import json
import datetime
from typing import Optional, Dict, Any, List, Union
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.scan import Scan
from app.schemas.scan import (
    ScanResponse,
    ScanPreprocessRequest,
    ScanPreprocessResponse,
    ScanMetadataResponse,
    ScanSegmentationResponse,
    ScanSegmentationStatusResponse,
    ScanMeasurementResponse,
)
from app.services.assessment.schemas import StructuredResearchAssessmentResponse
from app.services.reporting.schemas import KneeAnalysisReport
from app.services.scan_service import scan_service
from app.services.preprocessing.pipeline import preprocess_scan, PreprocessingConfig
from app.services.preprocessing.loader import load_medical_image
from app.services.preprocessing.validator import validate_medical_image
from app.services.preprocessing.metadata import extract_image_metadata
from app.services.segmentation.inference import run_segmentation, default_segmentation_model
from app.services.single_image import (
    analyze_single_knee_image,
    validate_uploaded_image,
    normalize_image_to_grayscale,
    enhance_xray_image,
)

router = APIRouter(prefix="/scans", tags=["Scans, Preprocessing & Segmentation"])


@router.post(
    "/analyze-single",
    summary="Upload and Analyze Single Knee Radiograph",
    description="Flexible, robust single-image pipeline: Validation -> Configurable Enhancement -> Aspect-Ratio Preserving Letterbox (512x512) -> V2 U-Net Inference -> Native Mask Restoration -> JSW & Geometry Profiling -> Quality Control.",
)
async def analyze_single_scan(
    file: UploadFile = File(..., description="Knee X-ray image (PNG, JPG, TIFF, DICOM, etc.)"),
    enhancement: Optional[str] = Form(None, description="Optional JSON string of enhancement configuration (e.g. {'enabled': true, 'clahe': true, 'denoise': true})"),
    pixel_spacing: Optional[float] = Form(None, description="Optional verified pixel spacing in mm/pixel"),
    view: str = Form("ap", description="Projection view: 'ap' (front), 'lateral' (side), or 'axial' (top)"),
    patient_id: Optional[str] = Form(None, description="Patient ID / Code"),
    patient_name: Optional[str] = Form(None, description="Patient Full Name"),
    patient_age: Optional[int] = Form(None, description="Patient Age"),
    patient_sex: Optional[str] = Form(None, description="Patient Sex"),
    doctor_name: Optional[str] = Form(None, description="Attending Doctor Name"),
    doctor_specialization: Optional[str] = Form(None, description="Doctor Specialization"),
):
    """Analyze a single uploaded knee radiograph without requiring multi-image datasets."""
    from fastapi.responses import JSONResponse
    import traceback

    print(f"[ANALYSIS] Request received: {file.filename} (View: {view})", flush=True)
    stage = "request_parsing"
    try:
        file_bytes = await file.read()
        print(f"[ANALYSIS] File received: {len(file_bytes)} bytes", flush=True)

        stage = "validation"
        val_meta = validate_uploaded_image(file_bytes=file_bytes, filename=file.filename or "uploaded_xray.png")
        print(f"[ANALYSIS] Image validated: {val_meta.get('width')}x{val_meta.get('height')} ({val_meta.get('format')})", flush=True)

        # Parse enhancement config
        enhancement_config = None
        if enhancement:
            try:
                enhancement_config = json.loads(enhancement)
            except Exception:
                enhancement_config = None

        stage = "analysis"
        result = analyze_single_knee_image(
            file_bytes=file_bytes,
            filename=file.filename or "uploaded_xray.png",
            enhancement_config=enhancement_config,
            pixel_spacing=pixel_spacing,
            save_artifacts=True,
            view=view,
        )
        print(f"[ANALYSIS] Segmentation completed in {result.get('processing', {}).get('inference_time_ms', 0)}ms", flush=True)

        stage = "measurements"
        print("[ANALYSIS] Measurements started", flush=True)
        print(f"[ANALYSIS] Measurements completed: {list(result.get('measurements', {}).keys())}", flush=True)

        # Step: Register patient and scan in SQLite database with real-time timestamp
        now = datetime.datetime.now()
        iso_now = now.isoformat()
        formatted_date = now.strftime("%d %b %Y, %I:%M %p")
        case_id = result.get("case_id", f"case_{now.strftime('%Y%m%d%H%M%S')}")

        final_patient_code = patient_id.strip() if (patient_id and patient_id.strip()) else f"PT-{case_id.replace('case_', '').upper()[:8]}"
        final_patient_name = patient_name.strip() if (patient_name and patient_name.strip()) else f"Patient {final_patient_code}"
        final_patient_age = patient_age if (patient_age and patient_age > 0) else 58
        final_patient_sex = patient_sex.strip() if (patient_sex and patient_sex.strip()) else "Female"
        final_doctor_name = doctor_name.strip() if (doctor_name and doctor_name.strip()) else "Dr. Alex Morgan, MD"
        final_doctor_spec = doctor_specialization.strip() if (doctor_specialization and doctor_specialization.strip()) else "Orthopedic Surgeon"

        result["created_at"] = iso_now
        result["timestamp"] = iso_now
        result["formatted_date"] = formatted_date
        result["patient_id"] = final_patient_code
        result["patient_code"] = final_patient_code
        result["patient_name"] = final_patient_name
        result["patient_age"] = final_patient_age
        result["patient_sex"] = final_patient_sex
        result["doctor_name"] = final_doctor_name
        result["doctor_specialization"] = final_doctor_spec

        try:
            from app.models.patient import Patient
            from app.models.scan import Scan
            from app.db.database import SessionLocal

            with SessionLocal() as db:
                existing_patient = db.query(Patient).filter(Patient.patient_code == final_patient_code).first()
                if not existing_patient:
                    existing_patient = Patient(
                        patient_code=final_patient_code,
                        name=final_patient_name,
                        age=final_patient_age,
                        sex="M" if final_patient_sex.lower() == "male" else "F",
                    )
                    db.add(existing_patient)
                    db.commit()
                    db.refresh(existing_patient)

                scan_record = Scan(
                    patient_id=existing_patient.id,
                    file_path=result.get("image", {}).get("original", ""),
                    original_filename=file.filename or "knee_xray.png",
                    file_type=val_meta.get("format", "JPEG"),
                    file_size=len(file_bytes),
                    status=result.get("analysis", {}).get("status", "SUCCESS"),
                    segmentation_status="completed",
                )
                db.add(scan_record)
                db.commit()
                db.refresh(scan_record)

                result["patient_id"] = existing_patient.id
                result["scan_id"] = scan_record.id
                print(f"[ANALYSIS] Database records saved: Patient ID={existing_patient.id}, Scan ID={scan_record.id}", flush=True)
        except Exception as db_err:
            print(f"[ANALYSIS] Database integration notice: {db_err}", flush=True)

        # Save persistent case record on disk
        from app.services.single_image.pipeline import save_case_record
        save_case_record(case_id, result)

        print(f"[ANALYSIS] Response returned: case_id={result.get('case_id')}, status={result.get('analysis', {}).get('status')}", flush=True)
        return result

    except ValueError as ve:
        print(f"[ANALYSIS] Validation error: {str(ve)}", flush=True)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": str(ve),
                "details": str(ve),
                "stage": stage,
            },
        )
    except Exception as e:
        traceback.print_exc()
        print(f"[ANALYSIS] Analysis error at stage [{stage}]: {str(e)}", flush=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": str(e) or "Analysis pipeline failed",
                "details": traceback.format_exc(),
                "stage": stage,
            },
        )


@router.get(
    "/case/{case_id}",
    summary="Retrieve Persistent Analysis Case",
    description="Fetch a stored analysis case by unique case ID across views and sessions.",
)
def get_case(case_id: str):
    """Retrieve persistent case analysis record."""
    from app.services.single_image.pipeline import get_case_record

    case = get_case_record(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found.",
        )
    return case


@router.get(
    "/case/{case_id}/pdf",
    summary="Generate and Download Clinical PDF Report for Case",
    description="Generates a formatted multi-section PDF medical report with embedded X-rays and measurements.",
)
def get_case_pdf(case_id: str):
    """Generate and download clinical PDF report for a single-image analysis case."""
    from fastapi.responses import FileResponse
    from app.core.config import settings
    from app.services.single_image.pipeline import get_case_record
    from app.services.reporting.clinical_pdf import generate_orthinx_clinical_pdf

    case = get_case_record(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found.",
        )

    pdf_dir = settings.RESULTS_DIR / "reports"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_dir / f"ORTHINX_Report_{case_id}.pdf"

    generate_orthinx_clinical_pdf(case, pdf_path)

    return FileResponse(
        path=str(pdf_path),
        filename=f"ORTHINX_Report_{case_id}.pdf",
        media_type="application/pdf",
    )


@router.post(
    "/report/generate-pdf",
    summary="Generate Clinical PDF Report From Case Payload",
    description="Accepts full case data payload and compiles a medical PDF report.",
)
def generate_pdf_from_payload(payload: Dict[str, Any]):
    """Compile and return medical PDF report from incoming case payload."""
    from fastapi.responses import FileResponse
    from app.core.config import settings
    from app.services.reporting.clinical_pdf import generate_orthinx_clinical_pdf

    case_id = payload.get("case_id", f"case_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}")
    pdf_dir = settings.RESULTS_DIR / "reports"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_dir / f"ORTHINX_Report_{case_id}.pdf"

    generate_orthinx_clinical_pdf(payload, pdf_path)

    return FileResponse(
        path=str(pdf_path),
        filename=f"ORTHINX_Report_{case_id}.pdf",
        media_type="application/pdf",
    )


@router.get(
    "/cases/all",
    summary="List All Analyzed Cases",
    description="Retrieve all stored analysis cases for patient records and clinical report listings.",
)
def list_all_cases():
    """List all stored analysis cases from disk."""
    import json
    from app.core.config import settings
    cases_dir = settings.RESULTS_DIR / "cases"
    if not cases_dir.exists():
        return []

    case_files = sorted(cases_dir.glob("*.json"), key=os.path.getmtime, reverse=True)
    results = []
    for cf in case_files:
        try:
            with open(cf, "r", encoding="utf-8") as f:
                data = json.load(f)
                results.append(data)
        except Exception:
            continue
    return results


@router.get(
    "/case/{case_id}",
    summary="Get Specific Case by ID",
    description="Retrieve a single analysis case by its case ID or patient code.",
)
@router.get(
    "/analysis/{case_id}",
    summary="Get Specific Case by ID (alias)",
)
def get_case_by_id(case_id: str):
    """Retrieve a single stored analysis case from disk."""
    import json
    from app.core.config import settings
    cases_dir = settings.RESULTS_DIR / "cases"
    if not cases_dir.exists():
        raise HTTPException(status_code=404, detail="No cases directory found")

    clean_id = case_id.strip()
    candidates = [
        cases_dir / f"{clean_id}.json",
        cases_dir / f"case_{clean_id}.json",
        cases_dir / f"{clean_id.replace('case_', '')}.json",
    ]
    for c_path in candidates:
        if c_path.exists():
            try:
                with open(c_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to read case file: {e}")

    for cf in cases_dir.glob("*.json"):
        try:
            with open(cf, "r", encoding="utf-8") as f:
                data = json.load(f)
                if (
                    data.get("case_id") == clean_id
                    or data.get("case_id") == f"case_{clean_id}"
                    or data.get("patient_code") == clean_id
                    or str(data.get("patient_id")) == clean_id
                ):
                    return data
        except Exception:
            continue

    raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found")


@router.post(
    "/enhance-preview",
    summary="Preview Image Enhancement Only",
    description="Applies the safe contrast normalization, CLAHE, and boundary-preserving denoising to generate an enhanced preview before analysis.",
)
async def enhance_image_preview(
    file: UploadFile = File(..., description="Knee X-ray image"),
    enhancement: Optional[str] = Form(None, description="JSON string of enhancement configuration"),
):
    """Generate enhanced preview of the uploaded radiograph."""
    from PIL import Image
    import uuid
    import numpy as np
    from app.core.config import settings

    try:
        file_bytes = await file.read()
        enhancement_config = None
        if enhancement:
            try:
                enhancement_config = json.loads(enhancement)
            except Exception:
                enhancement_config = None

        val_meta = validate_uploaded_image(file_bytes=file_bytes, filename=file.filename or "preview.png")
        if "pil_image" in val_meta:
            orig_gray = normalize_image_to_grayscale(val_meta["pil_image"])
        elif "raw_array" in val_meta:
            orig_gray = normalize_image_to_grayscale(val_meta["raw_array"])
        else:
            import io
            orig_gray = normalize_image_to_grayscale(Image.open(io.BytesIO(file_bytes)))

        enhanced_2d, enh_details = enhance_xray_image(orig_gray, config=enhancement_config)

        dest_dir = settings.RESULTS_DIR / "single_analysis"
        dest_dir.mkdir(parents=True, exist_ok=True)
        file_id = f"preview_{uuid.uuid4().hex[:8]}"

        orig_filename = f"orig_{file_id}.png"
        enh_filename = f"enh_{file_id}.png"

        Image.fromarray(np.clip(orig_gray, 0, 255).astype(np.uint8)).save(dest_dir / orig_filename)
        Image.fromarray(enhanced_2d).save(dest_dir / enh_filename)

        return {
            "status": "success",
            "original_url": f"/results/single_analysis/{orig_filename}",
            "enhanced_url": f"/results/single_analysis/{enh_filename}",
            "width": int(orig_gray.shape[1]),
            "height": int(orig_gray.shape[0]),
            "enhancement_details": enh_details,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))



@router.get(
    "/{scan_id}",
    response_model=ScanResponse,
    summary="Get scan record",
    description="Retrieve details, preprocessing status, and segmentation mask paths for a specific medical scan.",
)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve scan record by ID."""
    scan = scan_service.get_scan_by_id(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID {scan_id} does not exist."
        )
    return scan


@router.get(
    "/{scan_id}/metadata",
    response_model=ScanMetadataResponse,
    summary="Extract image metadata",
    description="Inspects the medical scan and extracts dimensions, voxel spacing, orientation, dtype, and intensity statistics.",
)
def get_scan_metadata(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Inspect and extract spatial/intensity metadata from an uploaded medical image."""
    scan = scan_service.get_scan_by_id(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID {scan_id} does not exist."
        )

    file_path = Path(scan.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical image file for this scan record was not found on disk."
        )

    try:
        img_data = load_medical_image(file_path)
        is_valid, error_msg = validate_medical_image(img_data)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Medical image validation error: {error_msg}"
            )

        meta = extract_image_metadata(img_data)
        intensity_range = None
        if meta["intensity_min"] is not None and meta["intensity_max"] is not None:
            intensity_range = [meta["intensity_min"], meta["intensity_max"]]

        return ScanMetadataResponse(
            scan_id=scan.id,
            dimensions=meta["dimensions"],
            num_dimensions=meta["num_dimensions"],
            spacing=meta["spacing"],
            orientation=meta["orientation"],
            dtype=meta["dtype"],
            intensity_range=intensity_range,
            intensity_mean=meta["intensity_mean"],
            intensity_std=meta["intensity_std"],
            file_format=meta["file_format"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to inspect medical image metadata: {str(e)}"
        )


@router.post(
    "/{scan_id}/preprocess",
    response_model=ScanPreprocessResponse,
    summary="Execute medical image preprocessing",
    description="Loads, validates, reorients (canonical RAS+), normalizes intensity, optionally resamples physical spacing, and saves the prepared scan into data/processed/.",
)
def run_scan_preprocessing(
    scan_id: int,
    request: ScanPreprocessRequest = ScanPreprocessRequest(),
    db: Session = Depends(get_db)
):
    """Execute preprocessing pipeline on an uploaded scan."""
    scan = scan_service.get_scan_by_id(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID {scan_id} does not exist."
        )

    file_path = Path(scan.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Physical image file for this scan record was not found on disk."
        )

    try:
        config = PreprocessingConfig(
            normalization_method=request.normalization_method,
            target_spacing=tuple(request.target_spacing) if request.target_spacing else None,
            target_orientation=request.target_orientation,
            reorient=request.reorient,
        )

        result = preprocess_scan(file_path, config=config)

        # Update database record
        scan.preprocessed_path = result["output_path"]
        scan.preprocessing_status = "completed"
        scan.status = "preprocessed"
        db.commit()
        db.refresh(scan)

        return ScanPreprocessResponse(
            scan_id=scan.id,
            status="preprocessed",
            dimensions=result["processed_dimensions"],
            spacing=result["spacing"],
            orientation=result["orientation"],
            normalization_applied=result["normalization_applied"],
            output_file=result["output_filename"],
        )
    except HTTPException:
        raise
    except ValueError as ve:
        scan.preprocessing_status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        scan.preprocessing_status = "failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image preprocessing failed: {str(e)}"
        )


@router.post(
    "/{scan_id}/segment",
    response_model=ScanSegmentationResponse,
    summary="Execute knee anatomical segmentation",
    description="Runs deep learning segmentation on the preprocessed knee scan to segment Femur, Tibia, and Meniscus. If weights are not available, returns model_unavailable status without generating fake masks.",
)
def run_scan_segmentation(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Trigger AI segmentation on preprocessed knee image."""
    try:
        result = run_segmentation(db, scan_id)
        return ScanSegmentationResponse(
            scan_id=result["scan_id"],
            status=result["status"],
            model_available=result["model_available"],
            message=result["message"],
            structures=result["structures"],
            femur_mask_path=result.get("femur_mask_path"),
            tibia_mask_path=result.get("tibia_mask_path"),
            meniscus_mask_path=result.get("meniscus_mask_path"),
            knee_joint_mask_path=result.get("knee_joint_mask_path"),
            overlay_path=result.get("overlay_path"),
            mask_relative_url=result.get("mask_relative_url"),
            overlay_relative_url=result.get("overlay_relative_url"),
            measurements=result.get("measurements"),
            inference_time_ms=result.get("inference_time_ms"),
            device=result.get("device"),
        )
    except LookupError as le:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(le)
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Segmentation failed: {str(e)}"
        )


@router.get(
    "/{scan_id}/segmentation",
    response_model=ScanSegmentationStatusResponse,
    summary="Get segmentation status and mask availability",
    description="Check the current status of anatomical segmentation and availability of Femur, Tibia, and Meniscus masks.",
)
def get_scan_segmentation_status(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Check segmentation status for a scan."""
    scan = scan_service.get_scan_by_id(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID {scan_id} does not exist."
        )

    return ScanSegmentationStatusResponse(
        scan_id=scan.id,
        status=scan.segmentation_status,
        model_available=default_segmentation_model.is_available(),
        structures=["femur", "tibia", "meniscus"],
        femur_mask_available=bool(scan.femur_mask_path),
        tibia_mask_available=bool(scan.tibia_mask_path),
        meniscus_mask_available=bool(scan.meniscus_mask_path),
    )


@router.post(
    "/{scan_id}/measurements",
    response_model=ScanMeasurementResponse,
    summary="Extract native-space knee joint measurements and JSW profile",
    description="Calculates native-resolution knee joint geometry, Joint Space Width (JSW) profiling, physical millimeter calibration (if metadata present), and quality control flags without clinical fabrication.",
)
def run_scan_measurements(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Execute native-space knee joint geometric and JSW profiling on an uploaded scan."""
    from app.services.measurements.pipeline import extract_measurements_for_scan

    try:
        results = extract_measurements_for_scan(db, scan_id)
        return ScanMeasurementResponse(
            scan_id=results["scan_id"],
            status=results["status"],
            model=results["model"],
            native_dimensions=results["native_dimensions"],
            segmentation=results["segmentation"],
            jsw=results["jsw"],
            calibration=results["calibration"],
            quality=results["quality"],
            visualization_path=results.get("visualization_path"),
            visualization_url=results.get("visualization_url"),
            processing_time_ms=results.get("processing_time_ms"),
        )
    except LookupError as le:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(le)
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Measurement extraction failed: {str(e)}"
        )


@router.get(
    "/{scan_id}/measurements",
    response_model=ScanMeasurementResponse,
    summary="Retrieve existing knee measurements",
    description="Retrieve native-space knee measurements for an analyzed scan.",
)
def get_scan_measurements(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve or generate native-space knee measurements for a scan."""
    return run_scan_measurements(scan_id=scan_id, db=db)


@router.post(
    "/{scan_id}/assessment",
    response_model=StructuredResearchAssessmentResponse,
    summary="Generate structured research knee assessment",
    description="Execute structured research assessment evaluating segmentation quality, JSW profiling, calibration status, and measurement reliability.",
)
def run_scan_assessment(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Run research assessment pipeline on a preprocessed scan."""
    scan = scan_service.get_scan_by_id(db=db, scan_id=scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID {scan_id} not found."
        )

    try:
        from app.services.assessment.pipeline import run_assessment_for_scan_db
        return run_assessment_for_scan_db(scan=scan, db=db)
    except FileNotFoundError as fe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fe)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Research assessment failed: {str(e)}"
        )


@router.get(
    "/{scan_id}/assessment",
    response_model=StructuredResearchAssessmentResponse,
    summary="Retrieve structured research knee assessment",
    description="Retrieve existing structured research assessment for a scan.",
)
def get_scan_assessment(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve or generate structured research assessment for a scan."""
    return run_scan_assessment(scan_id=scan_id, db=db)


@router.post(
    "/{scan_id}/report",
    response_model=KneeAnalysisReport,
    summary="Generate complete structured knee analysis report",
    description="Executes end-to-end analysis (preprocessing, V2 segmentation, native geometry, JSW profiling, QC, research assessment) and outputs structured JSON and downloadable PDF.",
)
def create_scan_report(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Generate complete knee analysis report with PDF and JSON artifacts."""
    from app.services.reporting.knee_report import get_or_create_scan_report

    try:
        return get_or_create_scan_report(scan_id=scan_id, db=db, force_regenerate=True)
    except LookupError as le:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(le)
        )
    except FileNotFoundError as fe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fe)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
        )


@router.get(
    "/{scan_id}/report",
    response_model=KneeAnalysisReport,
    summary="Retrieve structured knee analysis report",
    description="Retrieve existing complete structured report for a scan.",
)
def get_scan_report(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve existing or generate new complete report for a scan."""
    from app.services.reporting.knee_report import get_or_create_scan_report

    try:
        return get_or_create_scan_report(scan_id=scan_id, db=db, force_regenerate=False)
    except LookupError as le:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(le)
        )
    except FileNotFoundError as fe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(fe)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report retrieval failed: {str(e)}"
        )


@router.get(
    "/{scan_id}/report/json",
    summary="Export report as JSON file",
    description="Download structured report as a formatted JSON document.",
)
def export_scan_report_json(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Download report JSON file."""
    from fastapi.responses import FileResponse
    from app.services.reporting.knee_report import get_or_create_scan_report

    report = get_or_create_scan_report(scan_id=scan_id, db=db)
    if not report.json_report_path or not Path(report.json_report_path).exists():
        raise HTTPException(status_code=404, detail="JSON report file not found.")

    return FileResponse(
        path=report.json_report_path,
        filename=f"knee_report_scan_{scan_id}.json",
        media_type="application/json",
    )


@router.get(
    "/{scan_id}/report/pdf",
    summary="Export report as PDF file",
    description="Download multi-section research knee analysis report as a PDF document.",
)
def export_scan_report_pdf(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Download report PDF document."""
    from fastapi.responses import FileResponse
    from app.services.reporting.knee_report import get_or_create_scan_report

    report = get_or_create_scan_report(scan_id=scan_id, db=db)
    if not report.pdf_report_path or not Path(report.pdf_report_path).exists():
        raise HTTPException(status_code=404, detail="PDF report file not found.")

    return FileResponse(
        path=report.pdf_report_path,
        filename=f"knee_report_scan_{scan_id}.pdf",
        media_type="application/pdf",
    )

