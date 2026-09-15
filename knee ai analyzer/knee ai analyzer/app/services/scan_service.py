import os
import uuid
from pathlib import Path
from typing import Tuple, List, Optional
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.patient import Patient
from app.models.scan import Scan


class ScanService:
    @staticmethod
    def extract_and_validate_extension(filename: str) -> str:
        """
        Extract extension supporting multi-part extensions (e.g. .nii.gz)
        and validate against configured allowed extensions.
        """
        if not filename or not filename.strip():
            raise ValueError("Filename cannot be empty.")

        clean_name = Path(filename).name.lower()

        # Check multi-part extensions first (e.g. .nii.gz)
        matched_ext = None
        for ext in sorted(settings.ALLOWED_EXTENSIONS, key=len, reverse=True):
            if clean_name.endswith(ext.lower()):
                matched_ext = ext
                break

        if not matched_ext:
            allowed = ", ".join(settings.ALLOWED_EXTENSIONS)
            raise ValueError(
                f"Unsupported file format for '{filename}'. Allowed formats for KneeAI: {allowed}"
            )

        return matched_ext

    @staticmethod
    async def save_uploaded_file(file: UploadFile) -> Tuple[str, str, int]:
        """
        Stream upload chunks to disk securely, preventing memory exhaustion
        and generating a safe, collision-resistant unique filename.

        Returns: (stored_file_path, file_type, total_bytes)
        """
        original_filename = Path(file.filename or "unknown").name
        extension = ScanService.extract_and_validate_extension(original_filename)

        # Generate collision-free unique filename
        unique_token = uuid.uuid4().hex
        stored_filename = f"scan_{unique_token}{extension}"
        destination_path = settings.UPLOAD_DIR / stored_filename

        max_allowed_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        chunk_size = 1024 * 1024  # 1MB buffer chunk
        total_bytes = 0

        try:
            with open(destination_path, "wb") as buffer:
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_allowed_bytes:
                        raise ValueError(
                            f"File size exceeds maximum allowable limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                        )
                    buffer.write(chunk)

            if total_bytes == 0:
                raise ValueError("Uploaded file is empty (0 bytes).")

        except Exception:
            # Clean up partial or failed file from disk
            if destination_path.exists():
                try:
                    destination_path.unlink()
                except OSError:
                    pass
            raise

        file_type = extension.lstrip(".")
        return str(destination_path.resolve()), file_type, total_bytes

    @staticmethod
    async def process_and_create_scan(
        db: Session,
        patient_id: int,
        file: UploadFile
    ) -> Scan:
        """
        Validate patient existence, save image file safely to storage,
        and create the Scan database record.
        """
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise LookupError(f"Patient with ID {patient_id} not found.")

        stored_file_path, file_type, file_size = await ScanService.save_uploaded_file(file)
        original_filename = Path(file.filename or "unknown").name

        db_scan = Scan(
            patient_id=patient_id,
            file_path=stored_file_path,
            original_filename=original_filename,
            file_type=file_type,
            file_size=file_size,
            status="uploaded",
        )
        db.add(db_scan)
        db.commit()
        db.refresh(db_scan)
        return db_scan

    @staticmethod
    def get_scan_by_id(db: Session, scan_id: int) -> Optional[Scan]:
        """Fetch a scan record by ID."""
        return db.query(Scan).filter(Scan.id == scan_id).first()

    @staticmethod
    def list_scans_by_patient(db: Session, patient_id: int) -> List[Scan]:
        """Retrieve all scan records associated with a specific patient."""
        return db.query(Scan).filter(Scan.patient_id == patient_id).all()


scan_service = ScanService()
