from typing import Optional, Tuple
import numpy as np
from scipy.ndimage import zoom


def resample_image(
    data: np.ndarray,
    current_spacing: Optional[Tuple[float, ...]],
    target_spacing: Optional[Tuple[float, ...]] = None,
    order: int = 1,
) -> Tuple[np.ndarray, Optional[Tuple[float, ...]]]:
    """
    Resample medical image data to a specified target physical voxel spacing.

    If target_spacing is None or current_spacing is None, preserves original dimensions
    and physical spacing without arbitrary modification.

    Parameters:
    - data: Input image / volume array (2D or 3D).
    - current_spacing: Physical voxel spacing of input data (e.g. [0.5, 0.5, 1.0]).
    - target_spacing: Desired output physical voxel spacing (e.g. [1.0, 1.0, 1.0]).
    - order: Spline interpolation order (1 = bilinear/trilinear, 0 = nearest-neighbor).

    Returns:
    - (resampled_data, new_spacing)
    """
    if target_spacing is None or current_spacing is None:
        # Preserve original spacing and geometry without arbitrary alteration
        return data, current_spacing

    if len(current_spacing) != data.ndim or len(target_spacing) != data.ndim:
        raise ValueError(
            f"Spacing dimension mismatch: data is {data.ndim}D, "
            f"current_spacing has {len(current_spacing)} elements, "
            f"target_spacing has {len(target_spacing)} elements."
        )

    # Compute zoom scale factors based on physical resolution: factor = current / target
    zoom_factors = [
        float(c) / float(t)
        for c, t in zip(current_spacing, target_spacing)
    ]

    # If zoom factors are essentially 1.0, return original
    if all(abs(f - 1.0) < 1e-4 for f in zoom_factors):
        return data, target_spacing

    # Perform spline interpolation
    resampled = zoom(data, zoom_factors, order=order, mode="nearest", prefilter=True)
    return resampled.astype(np.float32), target_spacing
