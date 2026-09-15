from typing import Dict, Any, Optional
import numpy as np
from app.services.preprocessing.loader import MedicalImageData


def extract_image_metadata(img_data: MedicalImageData) -> Dict[str, Any]:
    """
    Extract standardized anatomical and spatial metadata from loaded image data.
    """
    arr = img_data.data
    shape = list(arr.shape)
    
    spacing = list(img_data.spacing) if img_data.spacing is not None else None
    orientation = img_data.orientation if img_data.orientation is not None else None

    # Compute intensity statistics
    min_val = float(np.min(arr)) if arr.size > 0 else None
    max_val = float(np.max(arr)) if arr.size > 0 else None
    mean_val = float(np.mean(arr)) if arr.size > 0 else None
    std_val = float(np.std(arr)) if arr.size > 0 else None

    return {
        "dimensions": shape,
        "num_dimensions": len(shape),
        "spacing": spacing,
        "orientation": orientation,
        "dtype": str(arr.dtype),
        "intensity_min": min_val,
        "intensity_max": max_val,
        "intensity_mean": mean_val,
        "intensity_std": std_val,
        "file_format": img_data.file_format,
        "header_meta": img_data.header_meta,
    }
