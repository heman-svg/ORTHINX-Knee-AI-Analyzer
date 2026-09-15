from typing import Literal
import numpy as np


NormalizationMethod = Literal["min_max", "z_score", "percentile_clip", "none"]


def normalize_image(
    data: np.ndarray,
    method: NormalizationMethod = "min_max",
    target_min: float = 0.0,
    target_max: float = 1.0,
    lower_percentile: float = 0.5,
    upper_percentile: float = 99.5,
    eps: float = 1e-8,
) -> np.ndarray:
    """
    Normalize medical image intensities using a configurable strategy.

    Methods:
    - 'min_max': Rescales array linearly to [target_min, target_max].
    - 'z_score': Standardizes to zero mean and unit variance.
    - 'percentile_clip': Robust MRI/CT normalization clipping outlier intensity tails
      before rescaling to [target_min, target_max].
    - 'none': Returns raw float32 array without modification.
    """
    arr = data.astype(np.float32, copy=True)

    if method == "none":
        return arr

    elif method == "min_max":
        min_v = np.min(arr)
        max_v = np.max(arr)
        if max_v - min_v < eps:
            return np.zeros_like(arr)
        scaled = (arr - min_v) / (max_v - min_v + eps)
        return (scaled * (target_max - target_min)) + target_min

    elif method == "z_score":
        mean_v = np.mean(arr)
        std_v = np.std(arr)
        if std_v < eps:
            return np.zeros_like(arr)
        return (arr - mean_v) / (std_v + eps)

    elif method == "percentile_clip":
        p_low = np.percentile(arr, lower_percentile)
        p_high = np.percentile(arr, upper_percentile)
        clipped = np.clip(arr, p_low, p_high)
        if p_high - p_low < eps:
            return np.zeros_like(clipped)
        scaled = (clipped - p_low) / (p_high - p_low + eps)
        return (scaled * (target_max - target_min)) + target_min

    else:
        raise ValueError(
            f"Unknown normalization method '{method}'. Supported methods: 'min_max', 'z_score', 'percentile_clip', 'none'."
        )
