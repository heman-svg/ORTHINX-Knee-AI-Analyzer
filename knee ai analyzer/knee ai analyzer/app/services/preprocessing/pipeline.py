import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import numpy as np
from PIL import Image

try:
    import nibabel as nib
except ImportError:
    nib = None

from app.core.config import settings
from app.services.preprocessing.loader import load_medical_image
from app.services.preprocessing.validator import validate_medical_image
from app.services.preprocessing.metadata import extract_image_metadata
from app.services.preprocessing.normalization import normalize_image, NormalizationMethod
from app.services.preprocessing.resampling import resample_image
from app.services.preprocessing.orientation import reorient_to_canonical


@dataclass
class PreprocessingConfig:
    """Configurable settings for the medical image preprocessing pipeline."""
    normalization_method: NormalizationMethod = "min_max"
    target_min: float = 0.0
    target_max: float = 1.0
    target_spacing: Optional[Tuple[float, ...]] = None
    target_orientation: Optional[str] = "RAS"
    reorient: bool = True


def preprocess_scan(
    input_file_path: str | Path,
    config: Optional[PreprocessingConfig] = None,
    output_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Execute end-to-end preprocessing for a single medical scan file:
    1. Load image and spatial metadata
    2. Numerically validate array
    3. Extract metadata
    4. Canonical anatomical reorientation (if 3D volume with affine)
    5. Intensity normalization
    6. Physical voxel resampling (if target spacing specified)
    7. Save processed artifact into data/processed/
    8. Return standardized metadata dictionary

    Does NOT execute segmentation or diagnostic inferences.
    """
    if config is None:
        config = PreprocessingConfig()

    out_directory = output_dir or settings.PROCESSED_DIR
    out_directory.mkdir(parents=True, exist_ok=True)

    # 1. Load Image
    img_data = load_medical_image(input_file_path)

    # 2. Validate
    is_valid, error_msg = validate_medical_image(img_data)
    if not is_valid:
        raise ValueError(f"Medical image validation failed: {error_msg}")

    # 3. Extract Initial Metadata
    initial_meta = extract_image_metadata(img_data)

    current_data = img_data.data
    current_affine = img_data.affine
    current_spacing = img_data.spacing
    current_orientation = img_data.orientation

    # 4. Canonical Reorientation (if applicable)
    if config.reorient and current_affine is not None and current_data.ndim >= 3:
        current_data, current_affine, current_orientation = reorient_to_canonical(
            current_data, current_affine, target_orientation=config.target_orientation or "RAS"
        )

    # 5. Normalization
    normalized_data = normalize_image(
        current_data,
        method=config.normalization_method,
        target_min=config.target_min,
        target_max=config.target_max,
    )

    # 6. Physical Resampling (if configured)
    resampled_data, updated_spacing = resample_image(
        normalized_data,
        current_spacing=current_spacing,
        target_spacing=config.target_spacing,
    )

    # 7. Save Processed Artifact Safely
    unique_token = uuid.uuid4().hex
    if resampled_data.ndim >= 3:
        # Save 3D / 4D volumes as standardized NIfTI (.nii.gz)
        output_filename = f"proc_{unique_token}.nii.gz"
        dest_path = out_directory / output_filename
        affine_to_save = current_affine if current_affine is not None else np.eye(4)
        if nib is not None:
            nii_out = nib.Nifti1Image(resampled_data.astype(np.float32), affine_to_save)
            nib.save(nii_out, str(dest_path))
        else:
            # Fallback to npy
            output_filename = f"proc_{unique_token}.npy"
            dest_path = out_directory / output_filename
            np.save(str(dest_path), resampled_data.astype(np.float32))
    else:
        # Save 2D standardized radiographs as PNG (scaled [0, 255])
        output_filename = f"proc_{unique_token}.png"
        dest_path = out_directory / output_filename
        # Rescale normalized float [0, 1] to uint8 [0, 255]
        min_v = float(np.min(resampled_data))
        max_v = float(np.max(resampled_data))
        if max_v > min_v:
            uint8_data = ((resampled_data - min_v) / (max_v - min_v) * 255.0).astype(np.uint8)
        else:
            uint8_data = np.zeros_like(resampled_data, dtype=np.uint8)
        Image.fromarray(uint8_data).save(str(dest_path))

    return {
        "status": "preprocessed",
        "output_filename": output_filename,
        "output_path": str(dest_path.resolve()),
        "original_dimensions": initial_meta["dimensions"],
        "processed_dimensions": list(resampled_data.shape),
        "spacing": list(updated_spacing) if updated_spacing is not None else None,
        "orientation": current_orientation,
        "normalization_applied": config.normalization_method,
        "dtype": str(resampled_data.dtype),
        "intensity_min": float(np.min(resampled_data)),
        "intensity_max": float(np.max(resampled_data)),
        "intensity_mean": float(np.mean(resampled_data)),
        "intensity_std": float(np.std(resampled_data)),
    }
