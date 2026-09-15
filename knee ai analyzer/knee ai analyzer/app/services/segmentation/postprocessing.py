from typing import Dict, Optional
import numpy as np
import torch
from scipy.ndimage import label


def postprocess_logits(
    logits: torch.Tensor,
    class_mapping: Optional[Dict[int, str]] = None,
    filter_components: bool = False,
) -> Dict[str, np.ndarray]:
    """
    Postprocess model output logits:
    1. Apply argmax along channel dimension to obtain class label map
    2. Split into distinct anatomical binary masks (femur, tibia, meniscus)
    3. Optional conservative connected-component filtering without anatomical alteration.

    Returns dictionary containing separate binary masks and combined segmentation map.
    """
    mapping = class_mapping or {0: "background", 1: "femur", 2: "tibia", 3: "meniscus"}

    # Convert logits to class index map (remove batch dimension)
    if logits.ndim > 3 and logits.shape[0] == 1:
        logits = logits.squeeze(0)  # Shape: (NumClasses, *SpatialDims)

    # Argmax over class channel (dim 0)
    class_indices = torch.argmax(logits, dim=0).cpu().numpy().astype(np.uint8)

    masks: Dict[str, np.ndarray] = {
        "combined": class_indices
    }

    # Extract individual binary masks according to class mapping
    for class_id, structure_name in mapping.items():
        if class_id == 0 or structure_name.lower() == "background":
            continue

        binary_mask = (class_indices == class_id).astype(np.uint8)

        if filter_components and np.sum(binary_mask) > 0:
            binary_mask = keep_largest_component(binary_mask)

        masks[structure_name.lower()] = binary_mask

    return masks


def keep_largest_component(binary_mask: np.ndarray) -> np.ndarray:
    """
    Keep the largest contiguous connected component in a binary mask,
    filtering out isolated floating noise voxels.
    """
    if np.sum(binary_mask) == 0:
        return binary_mask

    labeled_array, num_features = label(binary_mask)
    if num_features <= 1:
        return binary_mask

    # Find the largest label by volume
    component_sizes = np.bincount(labeled_array.ravel())
    # Exclude background label (0)
    component_sizes[0] = 0
    largest_label = int(np.argmax(component_sizes))

    return (labeled_array == largest_label).astype(np.uint8)
