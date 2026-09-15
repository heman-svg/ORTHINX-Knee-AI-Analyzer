import argparse
import sys
import time
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.services.training.config import TrainingConfig
from app.services.training.cgmh_adapter import CGMHKneeSegAdapter
from app.services.training.dataset import create_patient_splits, load_split_csv
from app.services.training.monai_dataset import create_monai_dataloaders
from app.services.training.trainer import SegmentationTrainer


def main():
    default_dir = str(settings.CGMH_DATASET_ROOT if settings.CGMH_DATASET_ROOT.exists() else settings.DATASET_DIR)

    parser = argparse.ArgumentParser(description="KneeAI CGMH KneeSeg 2D U-Net Segmentation Training")
    parser.add_argument("--data-dir", type=str, default=default_dir, help="Path to labelled dataset")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--device", type=str, default="auto", help="Compute device (auto/cuda/cpu)")
    parser.add_argument("--resume", action="store_true", help="Resume from latest checkpoint")
    args = parser.parse_args()

    print("=" * 65)
    print("KNEEAI CGMH KNEESEG 2D SEGMENTATION TRAINING")
    print("=" * 65)
    print(f"Target Dataset Directory: {args.data_dir}")

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"\n[-] Status: Dataset is not available locally. Dataset integration cannot proceed.")
        sys.exit(0)

    # Check if splits already exist
    splits_dir = Path("data/splits")
    train_csv = splits_dir / "train.csv"
    val_csv = splits_dir / "val.csv"
    test_csv = splits_dir / "test.csv"

    if train_csv.exists() and val_csv.exists() and test_csv.exists():
        train_files = load_split_csv(train_csv)
        val_files = load_split_csv(val_csv)
        test_files = load_split_csv(test_csv)
        print(f"[+] Loaded Existing Patient Splits: Train={len(train_files)}, Val={len(val_files)}, Test={len(test_files)}")
    else:
        pairs = CGMHKneeSegAdapter.discover_pairs(data_dir)
        if not pairs:
            print(f"\n[-] Status: No valid image-mask pairs found in '{args.data_dir}'.")
            sys.exit(0)
        print(f"[+] Discovered {len(pairs)} validated image-mask pairs.")
        train_files, val_files, test_files = create_patient_splits(
            pairs, splits_dir=splits_dir, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, seed=42
        )
        print(f"[+] Generated Patient Splits: Train={len(train_files)}, Val={len(val_files)}, Test={len(test_files)}")

    config = TrainingConfig(
        data_dir=data_dir,
        model_type="monai_unet_2d",
        spatial_dims=2,
        num_classes=2,
        in_channels=1,
        spatial_size_2d=(512, 512),
        num_epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        device=args.device,
        resume=args.resume,
    )

    # DataLoaders
    train_loader, val_loader, test_loader = create_monai_dataloaders(
        train_files, val_files, test_files=test_files, config=config
    )

    # Initialize Trainer
    trainer = SegmentationTrainer(config=config)

    # Execute Training
    t_start = time.time()
    results = trainer.fit(train_loader, val_loader)
    train_duration = time.time() - t_start

    print("\n" + "=" * 65)
    print("TRAINING COMPLETED")
    print(f"  Total Duration:      {train_duration:.1f} seconds")
    print(f"  Best Val Mean Dice:  {results['best_val_dice']:.4f}")
    print(f"  Best Checkpoint:     {results['best_model_path']}")
    print("=" * 65)

    # Evaluate Best Model on Untouched Test Set
    print("\n" + "=" * 65)
    print("EVALUATING BEST MODEL ON UNTOUCHED 60-PATIENT TEST SET")
    print("=" * 65)
    test_results = trainer.evaluate_test_set(test_loader)
    print(f"  Test Loss:           {test_results['test_loss']:.4f}")
    print(f"  Test Mean Dice:      {test_results['mean_dice']:.4f}")
    print(f"  Test Mean IoU:       {test_results['mean_iou']:.4f}")
    for k, v in test_results['per_class_metrics'].items():
        print(f"    - {k}: {v:.4f}")
    print("=" * 65)


if __name__ == "__main__":
    main()
