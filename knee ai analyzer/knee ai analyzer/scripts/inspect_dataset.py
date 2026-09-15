import argparse
import sys
from pathlib import Path
from typing import Dict, Any, List, Set
import numpy as np

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

try:
    import nibabel as nib
except ImportError:
    nib = None

from PIL import Image
from app.services.training.cgmh_adapter import CGMHKneeSegAdapter


def inspect_dataset(data_dir: str | Path) -> Dict[str, Any]:
    """
    Comprehensive dataset inspection utility supporting CGMH KneeSeg, OAI, and standard NIfTI/PNG formats.
    """
    root = Path(data_dir)
    return CGMHKneeSegAdapter.inspect_dataset_deep(root)


def main():
    parser = argparse.ArgumentParser(description="KneeAI Dataset Inspection & Verification Script")
    parser.add_argument("--data-dir", type=str, default="data/dataset", help="Path to raw dataset directory")
    args = parser.parse_args()

    print("=" * 65)
    print("KNEEAI CGMH KNEESEG DATASET INSPECTION")
    print("=" * 65)
    print(f"Target Directory: {args.data_dir}\n")

    report = inspect_dataset(args.data_dir)

    if not report.get("available", False):
        print(f"[-] Status: DATASET NOT FOUND")
        print(f"[-] {report.get('message', 'Dataset not available locally.')}")
        print("\nAction Required:")
        print("  1. Download the CGMH KneeSeg dataset from:")
        print("     https://www.kaggle.com/datasets/tommyngx/cgmh-kneeseg")
        print("  2. Place/extract the dataset into:")
        print(f"     {Path(args.data_dir).resolve()}")
        print("=" * 65)
        sys.exit(0)

    print(f"[+] Status: DATASET DISCOVERED & VERIFIED")
    print(f"[+] Total Images:      {report['total_images']}")
    print(f"[+] Total Masks:       {report['total_masks']}")
    print(f"[+] Valid Pairs:       {report['valid_pairs']}")
    print(f"[+] Unmatched Images:  {report['unmatched_images']}")
    print(f"[+] Unmatched Masks:   {report['unmatched_masks']}")
    print(f"[+] Subjects/Patients: {report['subject_count']}")
    print(f"[+] Format:            {'3D Volumetric' if report['is_3d'] else '2D Multi-Slice'}")
    print(f"[+] Image Shapes:      {report['image_shapes']}")
    print(f"[+] Mask Shapes:       {report['mask_shapes']}")
    print(f"[+] Unique Labels:     {report['unique_labels']}")
    if report.get("corrupted_files"):
        print(f"[!] Corrupted Files:   {report['corrupted_files']}")
    print("=" * 65)


if __name__ == "__main__":
    main()
