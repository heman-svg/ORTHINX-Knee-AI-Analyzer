import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), default=datetime.datetime.utcnow, nullable=False)

    # Relationships
    scans = relationship("Scan", back_populates="patient", cascade="all, delete-orphan", passive_deletes=True)

    def __repr__(self) -> str:
        return f"<Patient(id={self.id}, patient_code='{self.patient_code}', name='{self.name}')>"
