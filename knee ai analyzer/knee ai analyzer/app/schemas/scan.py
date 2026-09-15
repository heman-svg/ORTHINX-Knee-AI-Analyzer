from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict, Field


class ScanBase(BaseModel):
    patient_id: int
    original_filename: str
    file_type: str
    file_size: int
    status: str


class ScanResponse(BaseModel):
    scan_id: int = Field(..., validation_alias="id", serialization_alias="scan_id")
    patient_id: int
    original_filename: str
    file_type: str
    file_size: int
    status: str
    preprocessed_path: Optional[str] = None
    preprocessing_status: Optional[str] = "pending"
    segmentation_status: Optional[str] = "not_started"
    femur_mask_path: Optional[str] = None
    tibia_mask_path: Optional[str] = None
    meniscus_mask_path: Optional[str] = None
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class ScanPreprocessRequest(BaseModel):
    normalization_method: Literal["min_max", "z_score", "percentile_clip", "none"] = Field(
        "min_max", description="Intensity normalization method"
    )
    target_spacing: Optional[List[float]] = Field(
        None, description="Optional target physical voxel spacing [sx, sy, sz]"
    )
    target_orientation: Optional[str] = Field(
        "RAS", description="Target anatomical coordinate orientation (e.g. RAS)"
    )
    reorient: bool = Field(
        True, description="Whether to reorient 3D volumetric images to canonical orientation"
    )


class ScanPreprocessResponse(BaseModel):
    scan_id: int
    status: str
    dimensions: List[int]
    spacing: Optional[List[float]] = None
    orientation: Optional[str] = None
    normalization_applied: str
    output_file: str


class ScanMetadataResponse(BaseModel):
    scan_id: int
    dimensions: List[int]
    num_dimensions: int
    spacing: Optional[List[float]] = None
    orientation: Optional[str] = None
    dtype: str
    intensity_range: Optional[List[float]] = None
    intensity_mean: Optional[float] = None
    intensity_std: Optional[float] = None
    file_format: str


class ScanSegmentationResponse(BaseModel):
    scan_id: int
    status: str
    model_available: bool
    message: str
    structures: List[str]
    femur_mask_path: Optional[str] = None
    tibia_mask_path: Optional[str] = None
    meniscus_mask_path: Optional[str] = None
    knee_joint_mask_path: Optional[str] = None
    overlay_path: Optional[str] = None
    mask_relative_url: Optional[str] = None
    overlay_relative_url: Optional[str] = None
    measurements: Optional[dict] = None
    inference_time_ms: Optional[float] = None
    device: Optional[str] = None


class ScanSegmentationStatusResponse(BaseModel):
    scan_id: int
    status: str
    model_available: bool
    structures: List[str]
    femur_mask_available: bool
    tibia_mask_available: bool
    meniscus_mask_available: bool
    knee_joint_mask_available: bool = False


class ScanMeasurementResponse(BaseModel):
    scan_id: int
    status: str
    model: str
    native_dimensions: dict
    segmentation: dict
    jsw: dict
    calibration: dict
    quality: dict
    visualization_path: Optional[str] = None
    visualization_url: Optional[str] = None
    processing_time_ms: Optional[float] = None

