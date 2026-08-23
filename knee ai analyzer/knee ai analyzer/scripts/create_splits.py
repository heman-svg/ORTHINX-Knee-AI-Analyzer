import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.services.training.cgmh_adapter import CGMHKneeSegAdapter
from app.services.training.dataset import create_patient_splits


def main():
    dataset_path = settings.CGMH_DATASET_ROOT
    if not dataset_path.exists():
        dataset_path = settings.DATASET_DIR

    pairs = CGMHKneeSegAdapter.discover_pairs(dataset_path)
    if not pairs:
        print(f"[-] No valid pairs found in {dataset_path}")
        return

    splits_dir = Path("data/splits")
    train, val, test = create_patient_splits(
        pairs, splits_dir=splits_dir, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, seed=42
    )

    print("=" * 60)
    print("KNEEAI PATIENT-LEVEL SPLIT GENERATION")
    print("=" * 60)
    print(f"[+] Total Valid Pairs: {len(pairs)}")
    print(f"[+] Train Split:       {len(train)} pairs ({len(train)/len(pairs)*100:.1f}%) -> {splits_dir / 'train.csv'}")
    print(f"[+] Val Split:         {len(val)} pairs ({len(val)/len(pairs)*100:.1f}%) -> {splits_dir / 'val.csv'}")
    print(f"[+] Test Split:        {len(test)} pairs ({len(test)/len(pairs)*100:.1f}%) -> {splits_dir / 'test.csv'}")
    print("=" * 60)


if __name__ == "__main__":
    main()
