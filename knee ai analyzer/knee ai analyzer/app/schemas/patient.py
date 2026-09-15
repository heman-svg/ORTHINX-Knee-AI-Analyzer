from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class PatientBase(BaseModel):
    patient_code: str = Field(..., min_length=1, max_length=50, description="Unique hospital or patient identifier")
    name: str = Field(..., min_length=1, max_length=100, description="Full name of the patient")
    age: int = Field(..., ge=0, le=130, description="Age in years")
    sex: Literal["M", "F", "Other", "m", "f", "other"] = Field(..., description="Biological sex (M/F/Other)")


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Full name of the patient")
    age: Optional[int] = Field(None, ge=0, le=130, description="Age in years")
    sex: Optional[Literal["M", "F", "Other", "m", "f", "other"]] = Field(None, description="Biological sex (M/F/Other)")


class PatientResponse(PatientBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
