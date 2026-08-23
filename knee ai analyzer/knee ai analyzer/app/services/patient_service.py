import os
from pathlib import Path
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.models.scan import Scan
from app.schemas.patient import PatientCreate, PatientUpdate


class PatientService:
    @staticmethod
    def get_by_id(db: Session, patient_id: int) -> Optional[Patient]:
        """Fetch a single patient by primary key ID."""
        return db.query(Patient).filter(Patient.id == patient_id).first()

    @staticmethod
    def get_by_code(db: Session, patient_code: str) -> Optional[Patient]:
        """Fetch a single patient by unique patient code."""
        return db.query(Patient).filter(Patient.patient_code == patient_code).first()

    @staticmethod
    def list_patients(db: Session, skip: int = 0, limit: int = 50) -> List[Patient]:
        """Retrieve paginated list of patients."""
        return db.query(Patient).offset(skip).limit(limit).all()

    @staticmethod
    def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
        """Create a new patient record."""
        # Check uniqueness of patient_code
        existing = PatientService.get_by_code(db, patient_in.patient_code)
        if existing:
            raise ValueError(f"Patient with code '{patient_in.patient_code}' already exists.")

        db_patient = Patient(
            patient_code=patient_in.patient_code.strip(),
            name=patient_in.name.strip(),
            age=patient_in.age,
            sex=patient_in.sex.upper() if patient_in.sex.lower() in ["m", "f"] else patient_in.sex,
        )
        db.add(db_patient)
        db.commit()
        db.refresh(db_patient)
        return db_patient

    @staticmethod
    def update_patient(db: Session, patient_id: int, patient_update: PatientUpdate) -> Optional[Patient]:
        """Update an existing patient record."""
        db_patient = PatientService.get_by_id(db, patient_id)
        if not db_patient:
            return None

        update_data = patient_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                if key == "name":
                    setattr(db_patient, key, value.strip())
                elif key == "sex":
                    setattr(db_patient, key, value.upper() if value.lower() in ["m", "f"] else value)
                else:
                    setattr(db_patient, key, value)

        db.commit()
        db.refresh(db_patient)
        return db_patient

    @staticmethod
    def delete_patient(db: Session, patient_id: int) -> bool:
        """Safely delete patient and all associated scan records and physical scan files."""
        db_patient = PatientService.get_by_id(db, patient_id)
        if not db_patient:
            return False

        # Clean up physical files for all associated scans
        scans = db.query(Scan).filter(Scan.patient_id == patient_id).all()
        for scan in scans:
            if scan.file_path and os.path.exists(scan.file_path):
                try:
                    os.remove(scan.file_path)
                except OSError:
                    pass

        db.delete(db_patient)
        db.commit()
        return True


patient_service = PatientService()
