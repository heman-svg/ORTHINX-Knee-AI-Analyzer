from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import numpy as np
from PIL import Image

try:
    import nibabel as nib
except ImportError:
    nib = None

try:
    import pydicom
except ImportError:
    pydicom = None


@dataclass
class MedicalImageData:
    """Standardized internal representation of a loaded medical image/volume."""
    data: np.ndarray
    spacing: Optional[Tuple[float, ...]] = None
    affine: Optional[np.ndarray] = None
    orientation: Optional[str] = None
    file_format: str = "unknown"
    header_meta: Dict[str, Any] = field(default_factory=dict)


def load_medical_image(file_path: str | Path) -> MedicalImageData:
    """
    Safely load medical images (NIfTI 3D volumes, DICOM files, or 2D radiograph exports)
    preserving spatial geometry, orientation, and voxel spacing.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Medical image file not found at path: {file_path}")

    filename_lower = path.name.lower()

    # 1. NIfTI 3D / 4D Medical Volume (.nii, .nii.gz)
    if filename_lower.endswith(".nii") or filename_lower.endswith(".nii.gz"):
        if nib is None:
            raise RuntimeError("nibabel library is required to load NIfTI images.")
        
        nii_img = nib.load(str(path))
        # Ensure we have numeric data array
        data = np.asarray(nii_img.dataobj, dtype=np.float32)
        affine = np.array(nii_img.affine, dtype=np.float64)
        
        # Extract voxel spacing (zooms)
        header = nii_img.header
        zooms = header.get_zooms()
        spacing = tuple(float(z) for z in zooms[:len(data.shape)])

        # Determine spatial orientation (e.g. RAS, LAS, etc.)
        try:
            ornt_transform = nib.orientations.io_orientation(affine)
            orientation_code = nib.orientations.aff2axcodes(affine)
            orientation_str = "".join(orientation_code)
        except Exception:
            orientation_str = "UNKNOWN"

        return MedicalImageData(
            data=data,
            spacing=spacing,
            affine=affine,
            orientation=orientation_str,
            file_format="nifti",
            header_meta={
                "ndim": data.ndim,
                "shape": list(data.shape),
                "zooms": list(spacing),
                "data_type": str(header.get_data_dtype()),
            }
        )

    # 2. DICOM Single-slice or Multi-frame (.dcm)
    elif filename_lower.endswith(".dcm"):
        if pydicom is None:
            raise RuntimeError("pydicom library is required to load DICOM files.")

        ds = pydicom.dcmread(str(path))
        raw_array = ds.pixel_array.astype(np.float32)

        # Apply Rescale Slope and Intercept if present (Hounsfield Units / standardized intensities)
        slope = getattr(ds, "RescaleSlope", 1.0)
        intercept = getattr(ds, "RescaleIntercept", 0.0)
        data = (raw_array * float(slope)) + float(intercept)

        # Extract Pixel Spacing and Slice Thickness
        spacing = None
        pixel_spacing = getattr(ds, "PixelSpacing", None)
        slice_thickness = getattr(ds, "SliceThickness", None)
        if pixel_spacing:
            spacing_list = [float(p) for p in pixel_spacing]
            if slice_thickness:
                spacing_list.append(float(slice_thickness))
            spacing = tuple(spacing_list)

        # Image Orientation (Patient)
        orientation_str = None
        iop = getattr(ds, "ImageOrientationPatient", None)
        if iop:
            orientation_str = f"IOP_{'_'.join(f'{float(v):.2f}' for v in iop)}"

        return MedicalImageData(
            data=data,
            spacing=spacing,
            affine=None,
            orientation=orientation_str,
            file_format="dicom",
            header_meta={
                "Modality": getattr(ds, "Modality", "UNKNOWN"),
                "Rows": getattr(ds, "Rows", data.shape[0] if data.ndim > 0 else 0),
                "Columns": getattr(ds, "Columns", data.shape[1] if data.ndim > 1 else 0),
                "PhotometricInterpretation": getattr(ds, "PhotometricInterpretation", "MONOCHROME2"),
            }
        )

    # 3. 2D Standardized Radiograph Exports (.png, .jpg, .jpeg)
    elif any(filename_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
        with Image.open(str(path)) as pil_img:
            # Convert to grayscale if single channel or keep RGB
            if pil_img.mode not in ("L", "F", "I"):
                # Radiographs are inherently single-channel luminance
                pil_img = pil_img.convert("L")
            data = np.asarray(pil_img, dtype=np.float32)

        return MedicalImageData(
            data=data,
            spacing=None,  # 2D flat image exports usually have no physical calibrated mm spacing
            affine=None,
            orientation="2D_PLANAR",
            file_format="image_2d",
            header_meta={"mode": pil_img.mode, "size": pil_img.size}
        )

    else:
        raise ValueError(f"Unsupported file format for medical image loading: {path.name}")
