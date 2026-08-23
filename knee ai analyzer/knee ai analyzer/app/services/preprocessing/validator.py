from pathlib import Path
from typing import Tuple, Optional
import numpy as np
from app.services.preprocessing.loader import MedicalImageData


def validate_medical_image(img_data: MedicalImageData) -> Tuple[bool, Optional[str]]:
    """
    Validate that a loaded medical image is numerically sound, non-empty,
    and suitable for downstream preprocessing and inference.

    Returns: (is_valid, error_reason)
    """
    if img_data is None or img_data.data is None:
        return False, "Medical image data object is null or missing."

    arr = img_data.data

    # Check array emptiness
    if arr.size == 0:
        return False, "Medical image data array is empty (0 voxels/pixels)."

    # Check dimensionality (Knee imaging should be 2D projection or 3D/4D volumetric MRI/CT)
    if arr.ndim < 2 or arr.ndim > 4:
        return False, f"Invalid image dimensionality: {arr.ndim}D. Expected 2D or 3D/4D volume."

    # Check for NaN / Infinite values
    if not np.all(np.isfinite(arr)):
        nan_count = int(np.isnan(arr).sum())
        inf_count = int(np.isinf(arr).sum())
        return False, f"Medical image contains invalid numerical values ({nan_count} NaNs, {inf_count} Infs)."

    # Check that image is not completely uniform (e.g. all zeros / constant background)
    min_val = float(np.min(arr))
    max_val = float(np.max(arr))
    if min_val == max_val:
        return False, f"Medical image contains constant uniform value ({min_val}) with no signal variation."

    return True, None
