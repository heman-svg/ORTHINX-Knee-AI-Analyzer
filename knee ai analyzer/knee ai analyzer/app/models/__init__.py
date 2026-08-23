"""SQLAlchemy database models."""
from app.models.patient import Patient
from app.models.scan import Scan

__all__ = ["Patient", "Scan"]
