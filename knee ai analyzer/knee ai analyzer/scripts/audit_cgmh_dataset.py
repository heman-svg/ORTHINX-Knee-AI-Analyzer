import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, List, Set, Tuple
import numpy as np
from PIL import Image

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.services.training.cgmh_adapter import CGMHKneeSegAdapter
from app.services.training.dataset import load_split_csv
from app.services.training.visualization import save_triplet_visualization


def run_comprehensive_audit():
    dataset_path = settings.CGMH_DATASET_ROOT
    if not dataset_path.exists():
        dataset_path = settings.DATASET_DIR

    img_dir = dataset_path / "Image" if (dataset_path / "Image").exists() else dataset_path / "images"
    lbl_dir = dataset_path / "Label" if (dataset_path / "Label").exists() else dataset_path / "labels"

    img_files = sorted(list(img_dir.glob("*.png")))
    lbl_files = sorted(list(lbl_dir.glob("*.png")))

    total_images = len(img_files)
    total_masks = len(lbl_files)

    # 1. Matching & Duplicates
    img_names = set(f.name for f in img_files)
    lbl_names = set(f.name for f in lbl_files)

    valid_pairs = sorted(list(img_names.intersection(lbl_names)))
    missing_masks = sorted(list(img_names - lbl_names))
    missing_images = sorted(list(lbl_names - img_names))

    # Patient IDs
    patient_to_images = {}
    for f in img_files:
        pid = CGMHKneeSegAdapter.extract_subject_id(f.name)
        patient_to_images.setdefault(pid, []).append(f.name)

    duplicate_patients = {k: v for k, v in patient_to_images.items() if len(v) > 1}

    # Dimensions & Properties Analysis
    img_dimensions = []
    lbl_dimensions = []
    img_modes = set()
    lbl_modes = set()
    img_dtypes = set()
    lbl_dtypes = set()
    img_file_sizes = []
    lbl_file_sizes = []

    corrupted_images = []
    corrupted_masks = []
    alignment_failures = []

    unique_mask_values_all = set()
    masks_with_only_0_255 = 0
    masks_with_unexpected_values = []
    empty_masks = []  # No foreground
    completely_foreground_masks = []
    foreground_percentages = []
    foreground_pixel_counts = []

    for name in valid_pairs:
        img_p = img_dir / name
        lbl_p = lbl_dir / name

        # Image analysis
        try:
            img_sz = img_p.stat().st_size
            img_file_sizes.append(img_sz)
            with Image.open(img_p) as im:
                w, h = im.size
                img_dimensions.append((w, h))
                img_modes.add(im.mode)
                arr = np.array(im)
                img_dtypes.add(str(arr.dtype))
        except Exception as e:
            corrupted_images.append(f"{name}: {str(e)}")

        # Mask analysis
        try:
            lbl_sz = lbl_p.stat().st_size
            lbl_file_sizes.append(lbl_sz)
            with Image.open(lbl_p) as lm:
                lw, lh = lm.size
                lbl_dimensions.append((lw, lh))
                lbl_modes.add(lm.mode)
                l_arr = np.array(lm)
                lbl_dtypes.add(str(l_arr.dtype))

                # Check dimensions match
                if (w, h) != (lw, lh):
                    alignment_failures.append(f"{name}: image {w}x{h} != mask {lw}x{lh}")

                # Mask pixel value inspection
                vals = np.unique(l_arr)
                unique_mask_values_all.update(vals)
                
                is_standard = all(v in (0, 255) for v in vals)
                if is_standard:
                    masks_with_only_0_255 += 1
                else:
                    masks_with_unexpected_values.append((name, [int(v) for v in vals]))

                fg_pixels = int(np.sum(l_arr > 0))
                total_pixels = lw * lh
                fg_pct = (fg_pixels / total_pixels) * 100.0

                foreground_pixel_counts.append((name, fg_pixels, total_pixels, fg_pct))
                foreground_percentages.append(fg_pct)

                if fg_pixels == 0:
                    empty_masks.append(name)
                elif fg_pixels == total_pixels:
                    completely_foreground_masks.append(name)

        except Exception as e:
            corrupted_masks.append(f"{name}: {str(e)}")

    # Sort foreground counts to identify min/max/median
    foreground_pixel_counts.sort(key=lambda x: x[1])
    smallest_fg = foreground_pixel_counts[0]
    largest_fg = foreground_pixel_counts[-1]
    typical_fg = foreground_pixel_counts[len(foreground_pixel_counts) // 2]

    # Aspect ratios (W / H)
    aspect_ratios = [w / h for (w, h) in img_dimensions]

    # Check splits & leakage
    train_csv = Path("data/splits/train.csv")
    val_csv = Path("data/splits/val.csv")
    test_csv = Path("data/splits/test.csv")

    train_pids = set(x["patient_id"] for x in load_split_csv(train_csv))
    val_pids = set(x["patient_id"] for x in load_split_csv(val_csv))
    test_pids = set(x["patient_id"] for x in load_split_csv(test_csv))

    overlap_train_val = train_pids.intersection(val_pids)
    overlap_train_test = train_pids.intersection(test_pids)
    overlap_val_test = val_pids.intersection(test_pids)
    leakage_pass = len(overlap_train_val) == 0 and len(overlap_train_test) == 0 and len(overlap_val_test) == 0

    # Dimension statistics
    widths = [w for (w, h) in img_dimensions]
    heights = [h for (w, h) in img_dimensions]

    audit_summary = {
        "dataset_path": str(dataset_path),
        "total_images": total_images,
        "total_masks": total_masks,
        "valid_pairs": len(valid_pairs),
        "missing_masks": missing_masks,
        "missing_images": missing_images,
        "duplicate_patients_count": len(duplicate_patients),
        "corrupted_images": corrupted_images,
        "corrupted_masks": corrupted_masks,
        "alignment_failures": alignment_failures,
        "image_modes": list(img_modes),
        "label_modes": list(lbl_modes),
        "image_dtypes": list(img_dtypes),
        "label_dtypes": list(lbl_dtypes),
        "min_width": min(widths),
        "max_width": max(widths),
        "median_width": int(np.median(widths)),
        "min_height": min(heights),
        "max_height": max(heights),
        "median_height": int(np.median(heights)),
        "min_aspect_ratio": float(min(aspect_ratios)),
        "max_aspect_ratio": float(max(aspect_ratios)),
        "mean_aspect_ratio": float(np.mean(aspect_ratios)),
        "unique_mask_values": [int(v) for v in sorted(list(unique_mask_values_all))],
        "masks_with_only_0_255": masks_with_only_0_255,
        "masks_with_unexpected_values": masks_with_unexpected_values,
        "empty_masks_count": len(empty_masks),
        "empty_masks": empty_masks,
        "completely_foreground_masks_count": len(completely_foreground_masks),
        "mean_foreground_percentage": float(np.mean(foreground_percentages)),
        "min_foreground_percentage": float(min(foreground_percentages)),
        "max_foreground_percentage": float(max(foreground_percentages)),
        "smallest_fg_sample": smallest_fg,
        "largest_fg_sample": largest_fg,
        "typical_fg_sample": typical_fg,
        "train_patients_count": len(train_pids),
        "val_patients_count": len(val_pids),
        "test_patients_count": len(test_pids),
        "data_leakage_pass": leakage_pass,
        "total_image_size_mb": float(sum(img_file_sizes) / (1024 * 1024)),
        "total_mask_size_mb": float(sum(lbl_file_sizes) / (1024 * 1024)),
    }

    # Generate Audit Visualizations
    out_vis_dir = Path("data/audit_visualizations")
    out_vis_dir.mkdir(parents=True, exist_ok=True)

    train_samples = load_split_csv(train_csv)[:5]
    val_samples = load_split_csv(val_csv)[:5]
    test_samples = load_split_csv(test_csv)[:5]

    for category, samples in [("train", train_samples), ("val", val_samples), ("test", test_samples)]:
        for idx, item in enumerate(samples):
            with Image.open(item["image"]) as im, Image.open(item["mask"]) as lm:
                im_arr = np.array(im.convert("L"))
                lm_arr = (np.array(lm) > 127).astype(np.uint8)
                out_path = out_vis_dir / f"{category}_{idx+1}_{Path(item['image']).stem}_overlay.png"
                save_triplet_visualization(im_arr, lm_arr, lm_arr, out_path)

    # Save smallest, largest, typical overlays
    for tag, sample_info in [("smallest_fg", smallest_fg), ("largest_fg", largest_fg), ("typical_fg", typical_fg)]:
        name = sample_info[0]
        with Image.open(img_dir / name) as im, Image.open(lbl_dir / name) as lm:
            im_arr = np.array(im.convert("L"))
            lm_arr = (np.array(lm) > 127).astype(np.uint8)
            out_path = out_vis_dir / f"outlier_{tag}_{Path(name).stem}_overlay.png"
            save_triplet_visualization(im_arr, lm_arr, lm_arr, out_path)

    print(json.dumps(audit_summary, indent=2))
    return audit_summary


if __name__ == "__main__":
    run_comprehensive_audit()
