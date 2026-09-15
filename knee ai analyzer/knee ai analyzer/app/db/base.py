"""Database base module for registering all SQLAlchemy models."""
from app.db.database import Base
from app.models.patient import Patient
from app.models.scan import Scan

__all__ = ["Base", "Patient", "Scan"]
