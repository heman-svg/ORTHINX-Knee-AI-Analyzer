import argparse
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.services.training.config import TrainingConfig
from app.services.training.dataset import load_split_csv
from app.services.training.monai_dataset import create_monai_dataloaders
from app.services.training.trainer import SegmentationTrainer


def main():
    parser = argparse.ArgumentParser(description="KneeAI Model Evaluation on Untouched Test Set")
    parser.add_argument("--model-path", type=str, default="model_weights/best_model.pth", help="Path to checkpoint")
    parser.add_argument("--splits-dir", type=str, default="data/splits", help="Directory containing test.csv")
    args = parser.parse_args()

    print("=" * 65)
    print("KNEEAI SEGMENTATION TEST SET EVALUATION")
    print("=" * 65)

    model_path = Path(args.model_path)
    if not model_path.exists():
        print(f"[-] Model weights file '{args.model_path}' not found.")
        print("Evaluation cannot proceed without trained weights.")
        sys.exit(0)

    test_csv = Path(args.splits_dir) / "test.csv"
    if not test_csv.exists():
        print(f"[-] Test split manifest '{test_csv}' not found.")
        print("Please generate dataset splits first.")
        sys.exit(0)

    test_files = load_split_csv(test_csv)
    print(f"[+] Loaded {len(test_files)} test samples from {test_csv}.")

    config = TrainingConfig(checkpoint_dir=model_path.parent)
    _, _, test_loader = create_monai_dataloaders([], [], test_files=test_files, config=config)

    trainer = SegmentationTrainer(config=config)
    trainer.load_checkpoint(model_path)

    metrics = trainer.evaluate_test_set(test_loader)
    print("\n" + "=" * 65)
    print("TEST EVALUATION RESULTS:")
    print(f"  Overall Mean Dice: {metrics['mean_dice']:.4f}")
    print(f"  Overall Mean IoU:  {metrics['mean_iou']:.4f}")
    print("  Per-Class Metrics:")
    for k, v in metrics["per_class_metrics"].items():
        print(f"    - {k}: {v:.4f}")
    print("=" * 65)


if __name__ == "__main__":
    main()
