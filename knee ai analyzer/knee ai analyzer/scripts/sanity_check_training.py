import sys
from pathlib import Path
import numpy as np
import torch
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.services.training.config import TrainingConfig
from app.services.training.cgmh_adapter import CGMHKneeSegAdapter
from app.services.training.monai_dataset import create_monai_dataloaders
from app.services.training.trainer import SegmentationTrainer


def run_sanity_check():
    print("=" * 65)
    print("KNEEAI CGMH KNEESEG 2D TRAINING SANITY CHECK")
    print("=" * 65)

    dataset_path = settings.CGMH_DATASET_ROOT
    if not dataset_path.exists():
        dataset_path = settings.DATASET_DIR

    pairs = CGMHKneeSegAdapter.discover_pairs(dataset_path)
    if not pairs:
        print(f"[-] Error: No dataset pairs found in {dataset_path}")
        return False

    print(f"[1] Dataset Found: {len(pairs)} pairs discovered in '{dataset_path}'")

    # Inspect raw values before conversion
    sample_pair = pairs[0]
    with Image.open(sample_pair["image"]) as raw_im, Image.open(sample_pair["mask"]) as raw_msk:
        raw_im_size = raw_im.size
        raw_msk_arr = np.array(raw_msk)
        unique_raw = sorted(list(np.unique(raw_msk_arr)))

    print(f"[2] Raw Image Size (W, H): {raw_im_size}")
    print(f"[3] Raw Mask Unique Values (Before Conversion): {unique_raw}")

    # Configure 2D CGMH Training Engine
    config = TrainingConfig(
        model_type="monai_unet_2d",
        spatial_dims=2,
        num_classes=2,
        in_channels=1,
        batch_size=2,
        spatial_size_2d=(512, 512),
        device="cpu",
    )

    # Use first 4 samples for sanity check
    sanity_samples = pairs[:4]
    train_loader, val_loader, _ = create_monai_dataloaders(
        sanity_samples, sanity_samples, config=config
    )

    # Fetch 1 batch from DataLoader
    batch = next(iter(train_loader))
    images = batch["image"]
    masks = batch["mask"]

    print(f"[4] Batch Image Tensor Shape: {images.shape} (Expected: [2, 1, 512, 512])")
    print(f"[5] Batch Mask Tensor Shape:  {masks.shape}  (Expected: [2, 1, 512, 512])")

    # Check converted mask values
    unique_converted = sorted(list(torch.unique(masks).numpy()))
    print(f"[6] Transformed Mask Unique Values (After Conversion): {unique_converted} (Expected: [0, 1])")

    # Initialize Trainer & Model
    trainer = SegmentationTrainer(config=config)
    print(f"[7] Model Initialized: MONAI 2D U-Net (in_channels={config.in_channels}, out_channels={config.num_classes})")

    # Forward Pass
    trainer.model.train()
    trainer.optimizer.zero_grad()
    outputs = trainer.model(images)
    print(f"[8] Model Output Logits Shape: {outputs.shape} (Expected: [2, 2, 512, 512])")

    # Loss Calculation
    loss = trainer.loss_function(outputs, masks)
    loss_val = float(loss.item())
    is_valid_loss = not (np.isnan(loss_val) or np.isinf(loss_val))
    print(f"[9] Loss Calculated (DiceCELoss): {loss_val:.4f} (Valid / Non-NaN / Non-Inf: {is_valid_loss})")

    # Backward Pass & Optimizer Step
    loss.backward()
    trainer.optimizer.step()
    print("[10] Backward Pass & Optimizer Step: SUCCESS")

    # Validation Pass
    val_loss, val_dice, val_iou, per_class = trainer.validate_epoch(val_loader)
    print(f"[11] Validation Pass (Single Batch): Loss={val_loss:.4f}, Mean Dice={val_dice:.4f}, Mean IoU={val_iou:.4f}")
    print(f"[12] Per-Class Metrics: {per_class}")

    print("=" * 65)
    print("[+] SANITY CHECK PASSED: 2D Pipeline is verified and ready for training.")
    print("=" * 65)
    return True


if __name__ == "__main__":
    run_sanity_check()
