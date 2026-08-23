from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.schemas.scan import ScanResponse
from app.services.patient_service import patient_service
from app.services.scan_service import scan_service

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new patient",
    description="Registers a new patient record with a unique patient code.",
)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db)
):
    """Register a new patient."""
    try:
        return patient_service.create_patient(db, patient_in)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register patient due to a database error."
        )


@router.get(
    "",
    response_model=List[PatientResponse],
    summary="List all patients",
    description="Retrieve a paginated list of registered patients.",
)
def list_patients(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
    db: Session = Depends(get_db)
):
    """Retrieve all patients with pagination."""
    return patient_service.list_patients(db, skip=skip, limit=limit)


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
    summary="Get patient details",
    description="Fetch a single patient record by internal ID.",
)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve a single patient by ID."""
    patient = patient_service.get_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} does not exist."
        )
    return patient


@router.put(
    "/{patient_id}",
    response_model=PatientResponse,
    summary="Update patient details",
    description="Update non-primary key attributes for an existing patient.",
)
def update_patient(
    patient_id: int,
    patient_update: PatientUpdate,
    db: Session = Depends(get_db)
):
    """Update patient information."""
    updated_patient = patient_service.update_patient(db, patient_id, patient_update)
    if not updated_patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} does not exist."
        )
    return updated_patient


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a patient",
    description="Safely delete a patient record and all associated scan records and files.",
)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db)
):
    """Delete a patient record and associated scan records."""
    success = patient_service.delete_patient(db, patient_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} does not exist."
        )
    return {"message": "Patient successfully deleted", "patient_id": patient_id}


@router.post(
    "/{patient_id}/images",
    response_model=ScanResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Images", "Patients"],
    summary="Upload knee medical scan",
    description="Uploads a medical image/scan (e.g. .nii, .nii.gz, .dcm, .png) for a patient and creates a scan record.",
)
async def upload_patient_scan(
    patient_id: int,
    file: UploadFile = File(..., description="Medical image file (.nii, .nii.gz, .dcm, .png, etc.)"),
    db: Session = Depends(get_db)
):
    """Upload and record a knee medical scan for a patient."""
    try:
        scan = await scan_service.process_and_create_scan(db, patient_id, file)
        return scan
    except LookupError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as ex:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store uploaded scan: {str(ex)}"
        )


@router.get(
    "/{patient_id}/images",
    response_model=List[ScanResponse],
    tags=["Images", "Patients"],
    summary="List patient scans",
    description="Retrieve all scan records associated with a specific patient.",
)
def list_patient_scans(
    patient_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve all scans for a given patient."""
    patient = patient_service.get_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} does not exist."
        )
    return scan_service.list_scans_by_patient(db, patient_id)
