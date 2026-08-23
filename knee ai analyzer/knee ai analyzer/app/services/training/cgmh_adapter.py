import re
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any, Set
import numpy as np
from PIL import Image

try:
    import nibabel as nib
except ImportError:
    nib = None


class CGMHKneeSegAdapter:
    """
    Dedicated Adapter for CGMH KneeSeg (Chang Gung Memorial Hospital Knee Segmentation) dataset.
    
    Supports:
    1. Direct Image/ and Label/ folder structures with matching PNG filenames.
    2. Volumetric NIfTI pairs (.nii, .nii.gz).
    3. Multi-slice 2D PNG/JPG image & mask pairs.
    4. Nested subject directories.
    5. Binary [0, 255] or multi-class integer masks.
    """

    @staticmethod
    def extract_subject_id(filename: str) -> str:
        """
        Extract clean subject/patient identifier from filename.
        Examples:
        - '1013_0.png' -> '1013'
        - 'CGMH_001_slice_05.png' -> 'cgmh_001'
        - 'CGMH_Case_001_image.png' -> 'cgmh_case_001'
        - 'Knee_Patient_12_mask.png' -> 'knee_patient_12'
        - 'Case104_image.nii.gz' -> 'case104'
        """
        stem = Path(filename).name
        for ext in [".nii.gz", ".nii", ".dcm", ".png", ".jpg", ".jpeg"]:
            if stem.lower().endswith(ext):
                stem = stem[:-len(ext)]
                break

        # Remove slice indices and role suffixes
        cleaned = re.sub(r"(_slice[_-]?\d+|_image|_mask|_label|_seg|_img|_0000)$", "", stem, flags=re.IGNORECASE)
        # If filename is {case}_{side}, e.g. 1013_0, group by case 1013
        if "_" in cleaned and re.match(r"^\d+_\d+$", cleaned):
            cleaned = cleaned.split("_")[0]

        cleaned = re.sub(r"[_-]+$", "", cleaned)
        return cleaned.lower()

    @classmethod
    def discover_pairs(cls, dataset_dir: str | Path) -> List[Dict[str, str]]:
        """
        Recursively discovers image and mask pairs from CGMH KneeSeg directory structure.
        """
        root = Path(dataset_dir)
        if not root.exists() or not root.is_dir():
            return []

        image_extensions = {".nii", ".nii.gz", ".png", ".jpg", ".jpeg", ".dcm"}

        # Check for direct Image/ and Label/ subdirectories (standard CGMH KneeSeg structure)
        image_dirs = [d for d in root.iterdir() if d.is_dir() and d.name.lower() in ("image", "images", "imagestr")]
        label_dirs = [d for d in root.iterdir() if d.is_dir() and d.name.lower() in ("label", "labels", "labelstr", "mask", "masks")]

        if image_dirs and label_dirs:
            img_dir = image_dirs[0]
            lbl_dir = label_dirs[0]

            img_files = [f for f in img_dir.iterdir() if f.is_file() and any(f.name.lower().endswith(ext) for ext in image_extensions)]
            pairs: List[Dict[str, str]] = []

            for img_f in sorted(img_files, key=lambda x: x.name):
                lbl_f = lbl_dir / img_f.name
                if lbl_f.exists():
                    pairs.append({
                        "patient_id": cls.extract_subject_id(img_f.name),
                        "subject_id": cls.extract_subject_id(img_f.name),
                        "image": str(img_f.resolve()),
                        "mask": str(lbl_f.resolve()),
                    })
                else:
                    # Try matching by normalized key if exact name doesn't match
                    matching_labels = [
                        l for l in lbl_dir.iterdir()
                        if l.is_file() and cls._normalize_key(l.name) == cls._normalize_key(img_f.name)
                    ]
                    if matching_labels:
                        pairs.append({
                            "patient_id": cls.extract_subject_id(img_f.name),
                            "subject_id": cls.extract_subject_id(img_f.name),
                            "image": str(img_f.resolve()),
                            "mask": str(matching_labels[0].resolve()),
                        })

            return pairs

        # Fallback recursive matching for flat or nested structures
        all_files = [
            f for f in root.rglob("*")
            if f.is_file() and any(f.name.lower().endswith(ext) for ext in image_extensions)
        ]

        images: List[Path] = []
        masks: List[Path] = []

        for f in all_files:
            lower = f.name.lower()
            parent_lower = f.parent.name.lower()
            if "mask" in lower or "label" in lower or "seg" in lower or "mask" in parent_lower or "label" in parent_lower:
                masks.append(f)
            else:
                images.append(f)

        mask_lookup: Dict[str, Path] = {}
        for m in masks:
            m_key = cls._normalize_key(m.name)
            mask_lookup[m_key] = m

        pairs: List[Dict[str, str]] = []
        for img in images:
            img_key = cls._normalize_key(img.name)
            if img_key in mask_lookup:
                mask_file = mask_lookup[img_key]
                pairs.append({
                    "patient_id": cls.extract_subject_id(img.name),
                    "subject_id": cls.extract_subject_id(img.name),
                    "image": str(img.resolve()),
                    "mask": str(mask_file.resolve()),
                })

        return sorted(pairs, key=lambda x: x["image"])

    @staticmethod
    def _normalize_key(filename: str) -> str:
        """Helper to create matching key between image and mask filenames."""
        stem = Path(filename).name.lower()
        for ext in [".nii.gz", ".nii", ".dcm", ".png", ".jpg", ".jpeg"]:
            if stem.endswith(ext):
                stem = stem[:-len(ext)]
                break
        stem = re.sub(r"(image|img|raw|volume)", "", stem)
        stem = re.sub(r"(mask|label|seg|annotation)", "", stem)
        stem = re.sub(r"[_\W]+", "", stem)
        return stem

    @classmethod
    def inspect_dataset_deep(cls, dataset_dir: str | Path) -> Dict[str, Any]:
        """
        Deep inspection of dataset files.
        """
        root = Path(dataset_dir)
        if not root.exists():
            return {
                "status": "not_found",
                "available": False,
                "message": f"Dataset directory '{dataset_dir}' does not exist on disk.",
                "images_count": 0,
                "masks_count": 0,
                "total_images": 0,
                "total_masks": 0,
                "valid_pairs": 0,
            }

        pairs = cls.discover_pairs(root)
        
        # Check subdirectories if standard layout
        image_dirs = [d for d in root.iterdir() if d.is_dir() and d.name.lower() in ("image", "images", "imagestr")]
        label_dirs = [d for d in root.iterdir() if d.is_dir() and d.name.lower() in ("label", "labels", "labelstr", "mask", "masks")]

        if image_dirs and label_dirs:
            all_images = [f for f in image_dirs[0].iterdir() if f.is_file() and any(f.name.lower().endswith(ext) for ext in [".nii", ".nii.gz", ".png", ".jpg", ".jpeg", ".dcm"])]
            all_masks = [f for f in label_dirs[0].iterdir() if f.is_file() and any(f.name.lower().endswith(ext) for ext in [".nii", ".nii.gz", ".png", ".jpg", ".jpeg", ".dcm"])]
        else:
            all_images = [
                f for f in root.rglob("*")
                if f.is_file() and any(f.name.lower().endswith(ext) for ext in [".nii", ".nii.gz", ".png", ".jpg", ".jpeg", ".dcm"])
                and not any(k in f.name.lower() or k in f.parent.name.lower() for k in ["mask", "label", "seg"])
            ]
            all_masks = [
                f for f in root.rglob("*")
                if f.is_file() and any(f.name.lower().endswith(ext) for ext in [".nii", ".nii.gz", ".png", ".jpg", ".jpeg", ".dcm"])
                and any(k in f.name.lower() or k in f.parent.name.lower() for k in ["mask", "label", "seg"])
            ]

        if not pairs and not all_images:
            return {
                "status": "empty",
                "available": False,
                "message": f"Directory '{dataset_dir}' is empty or contains no supported medical images.",
                "images_count": 0,
                "masks_count": 0,
                "total_images": 0,
                "total_masks": 0,
                "valid_pairs": 0,
            }

        unique_labels: Set[int] = set()
        img_shapes: Set[tuple] = set()
        mask_shapes: Set[tuple] = set()
        spacings: Set[tuple] = set()
        corrupted: List[str] = []
        is_3d = False

        for p in pairs[:50]:
            img_p = Path(p["image"])
            mask_p = Path(p["mask"])
            try:
                if img_p.name.endswith(".nii") or img_p.name.endswith(".nii.gz"):
                    is_3d = True
                    if nib:
                        img_nii = nib.load(str(img_p))
                        mask_nii = nib.load(str(mask_p))
                        img_shapes.add(img_nii.shape)
                        mask_shapes.add(mask_nii.shape)
                        spacings.add(tuple(round(float(z), 3) for z in img_nii.header.get_zooms()[:len(img_nii.shape)]))
                        mask_arr = np.asarray(mask_nii.dataobj)
                        unique_labels.update([int(v) for v in np.unique(mask_arr)])
                else:
                    with Image.open(img_p) as pil_img, Image.open(mask_p) as pil_mask:
                        img_shapes.add(pil_img.size)
                        mask_shapes.add(pil_mask.size)
                        mask_arr = np.array(pil_mask)
                        unique_labels.update([int(v) for v in np.unique(mask_arr)])
            except Exception as e:
                corrupted.append(f"{img_p.name}: {str(e)}")

        subjects = {p["subject_id"] for p in pairs}

        return {
            "status": "inspected",
            "available": True,
            "dataset_path": str(root.resolve()),
            "images_count": len(all_images),
            "masks_count": len(all_masks),
            "total_images": len(all_images),
            "total_masks": len(all_masks),
            "valid_pairs": len(pairs),
            "unmatched_images": len(all_images) - len(pairs),
            "unmatched_masks": len(all_masks) - len(pairs),
            "subject_count": len(subjects),
            "is_3d": is_3d,
            "image_shapes": [list(s) for s in img_shapes],
            "mask_shapes": [list(s) for s in mask_shapes],
            "voxel_spacings": [list(sp) for sp in spacings],
            "unique_labels": sorted(list(unique_labels)),
            "corrupted_files": corrupted,
            "sample_pairs": pairs[:5],
        }
