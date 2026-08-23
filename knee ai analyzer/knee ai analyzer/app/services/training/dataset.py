import csv
import re
from pathlib import Path
from typing import List, Dict, Tuple, Any, Optional
import numpy as np

try:
    import nibabel as nib
except ImportError:
    nib = None


def extract_patient_id(filename: str) -> str:
    """
    Extract patient identifier from filename to ensure patient-level splitting
    and prevent cross-split data leakage.
    Examples:
    - 'knee_001_0000.nii.gz' -> 'knee_001'
    - 'patient_12_mask.nii.gz' -> 'patient_12'
    - 'case42_slice05.png' -> 'case42'
    """
    stem = Path(filename).name.replace(".nii.gz", "").replace(".nii", "").replace(".dcm", "").replace(".png", "")
    # Remove common suffixes like _0000, _image, _mask, _label, _img, _seg
    cleaned = re.sub(r"(_0000|_image|_mask|_label|_img|_seg|_scan)$", "", stem, flags=re.IGNORECASE)
    # Match patient/case/sub patterns
    match = re.match(r"^([a-zA-Z]+[_-]?\d+)", cleaned)
    if match:
        return match.group(1).lower()
    return cleaned.lower()


def find_and_pair_samples(data_dir: str | Path) -> List[Dict[str, str]]:
    """
    Pair image files with corresponding segmentation mask files with validation.
    Returns: List of dicts [{'patient_id': str, 'image': str, 'mask': str}]
    """
    root = Path(data_dir)
    if not root.exists():
        return []

    images_dir = root / "images" if (root / "images").exists() else (root / "imagesTr" if (root / "imagesTr").exists() else root)
    masks_dir = root / "labels" if (root / "labels").exists() else (root / "labelsTr" if (root / "labelsTr").exists() else (root / "masks" if (root / "masks").exists() else root))

    image_extensions = {".nii", ".nii.gz", ".png", ".jpg", ".jpeg", ".dcm"}
    
    # Collect potential image and mask paths
    raw_images = [f for f in images_dir.iterdir() if any(f.name.lower().endswith(ext) for ext in image_extensions)]
    raw_masks = [f for f in masks_dir.iterdir() if any(f.name.lower().endswith(ext) for ext in image_extensions)]

    # Filter if images and masks are in the same folder
    if images_dir == masks_dir:
        image_candidates = [f for f in raw_images if not any(k in f.name.lower() for k in ["mask", "label", "seg"])]
        mask_candidates = [f for f in raw_masks if any(k in f.name.lower() for k in ["mask", "label", "seg"])]
    else:
        image_candidates = raw_images
        mask_candidates = raw_masks

    # Create mapping by normalized identifier
    mask_map = {}
    for m in mask_candidates:
        key = extract_patient_id(m.name)
        mask_map[key] = m

    pairs = []
    for img in image_candidates:
        key = extract_patient_id(img.name)
        if key in mask_map:
            mask_path = mask_map[key]
            pairs.append({
                "patient_id": key,
                "image": str(img.resolve()),
                "mask": str(mask_path.resolve()),
            })

    return sorted(pairs, key=lambda x: x["patient_id"])


def validate_image_mask_pair(image_path: str | Path, mask_path: str | Path) -> Tuple[bool, Optional[str]]:
    """
    Validate that an image/mask pair is physically readable and dimensions match.
    """
    img_p, mask_p = Path(image_path), Path(mask_path)
    if not img_p.exists():
        return False, f"Image file '{img_p.name}' does not exist."
    if not mask_p.exists():
        return False, f"Mask file '{mask_p.name}' does not exist."

    try:
        if img_p.name.endswith(".nii") or img_p.name.endswith(".nii.gz"):
            if nib is None:
                return False, "nibabel not installed."
            img = nib.load(str(img_p))
            mask = nib.load(str(mask_p))
            if img.shape != mask.shape:
                return False, f"Dimension mismatch: image shape {img.shape} != mask shape {mask.shape}."
        return True, None
    except Exception as e:
        return False, f"Pair validation error: {str(e)}"


def create_patient_splits(
    pairs: List[Dict[str, str]],
    splits_dir: Optional[Path] = None,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[List[Dict[str, str]], List[Dict[str, str]], List[Dict[str, str]]]:
    """
    Deterministically split samples at the PATIENT level to guarantee no leakage.
    Saves split CSV manifests to splits_dir (e.g. data/splits/train.csv).
    """
    if not pairs:
        return [], [], []

    # Group pairs by unique patient ID
    patient_to_samples: Dict[str, List[Dict[str, str]]] = {}
    for item in pairs:
        pid = item["patient_id"]
        patient_to_samples.setdefault(pid, []).append(item)

    unique_patients = sorted(list(patient_to_samples.keys()))
    rng = np.random.RandomState(seed)
    rng.shuffle(unique_patients)

    n_total = len(unique_patients)
    n_train = int(np.round(n_total * train_ratio))
    n_val = int(np.round(n_total * val_ratio))
    
    # Ensure at least 1 sample in validation/test if data allows
    if n_total >= 3:
        n_train = max(1, min(n_train, n_total - 2))
        n_val = max(1, min(n_val, n_total - n_train - 1))

    train_patients = set(unique_patients[:n_train])
    val_patients = set(unique_patients[n_train:n_train + n_val])
    test_patients = set(unique_patients[n_train + n_val:])

    train_set = [item for p in train_patients for item in patient_to_samples[p]]
    val_set = [item for p in val_patients for item in patient_to_samples[p]]
    test_set = [item for p in test_patients for item in patient_to_samples[p]]

    # Save to CSV files
    if splits_dir:
        splits_dir.mkdir(parents=True, exist_ok=True)
        save_split_csv(splits_dir / "train.csv", train_set)
        save_split_csv(splits_dir / "val.csv", val_set)
        save_split_csv(splits_dir / "test.csv", test_set)

    return train_set, val_set, test_set


def save_split_csv(filepath: Path, items: List[Dict[str, str]]) -> None:
    """Save split records to CSV file."""
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["patient_id", "image", "mask"], extrasaction="ignore")
        writer.writeheader()
        for row in items:
            writer.writerow(row)


def load_split_csv(filepath: str | Path) -> List[Dict[str, str]]:
    """Load split manifest from CSV file."""
    path = Path(filepath)
    if not path.exists():
        return []
    items = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            items.append(dict(row))
    return items
