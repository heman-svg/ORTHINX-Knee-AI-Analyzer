import datetime
from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    status = Column(String(50), nullable=False, default="uploaded")
    
    # Preprocessing tracking
    preprocessed_path = Column(String(500), nullable=True)
    preprocessing_status = Column(String(50), nullable=False, default="pending")
    
    # Segmentation tracking
    segmentation_status = Column(String(50), nullable=False, default="not_started")
    femur_mask_path = Column(String(500), nullable=True)
    tibia_mask_path = Column(String(500), nullable=True)
    meniscus_mask_path = Column(String(500), nullable=True)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="scans")

    def __repr__(self) -> str:
        return f"<Scan(id={self.id}, patient_id={self.patient_id}, original_filename='{self.original_filename}', status='{self.status}', segmentation_status='{self.segmentation_status}')>"
