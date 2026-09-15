from typing import Tuple, Optional
import numpy as np

try:
    import nibabel as nib
except ImportError:
    nib = None


def reorient_to_canonical(
    data: np.ndarray,
    affine: Optional[np.ndarray],
    target_orientation: str = "RAS",
) -> Tuple[np.ndarray, Optional[np.ndarray], str]:
    """
    Reorient volumetric data to standard canonical coordinate orientation (e.g. RAS+).

    Returns: (oriented_data, updated_affine, new_orientation_string)
    """
    if affine is None or data.ndim < 3 or nib is None:
        # Cannot reorient 2D images or data without spatial transformation affine
        return data, affine, "ORIGINAL"

    try:
        current_ornt = nib.orientations.io_orientation(affine)
        target_ornt = nib.orientations.axcodes2ornt(target_orientation)
        transform_ornt = nib.orientations.ornt_transform(current_ornt, target_ornt)

        reoriented_data = nib.orientations.apply_orientation(data, transform_ornt)
        updated_affine = affine.copy()

        # Update affine transformation matrix
        affine_transform = nib.orientations.inv_ornt_aff(transform_ornt, data.shape)
        updated_affine = np.dot(affine, affine_transform)

        new_codes = nib.orientations.aff2axcodes(updated_affine)
        new_orientation_str = "".join(new_codes)

        return reoriented_data.astype(np.float32), updated_affine, new_orientation_str

    except Exception:
        # Fallback gracefully if orientation transform fails
        return data, affine, "UNKNOWN"
