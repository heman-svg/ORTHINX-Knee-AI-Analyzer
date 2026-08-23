from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.scan import ScanResponse
from app.services.scan_service import scan_service

router = APIRouter(prefix="/images", tags=["Images"])


@router.get(
    "/{scan_id}",
    response_model=ScanResponse,
    summary="Get scan metadata",
    description="Retrieve metadata for a specific uploaded scan by ID.",
)
def get_scan(
    scan_id: int,
    db: Session = Depends(get_db)
):
    """Retrieve scan metadata by ID."""
    scan = scan_service.get_scan_by_id(db, scan_id)
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan with ID {scan_id} does not exist."
        )
    return scan
