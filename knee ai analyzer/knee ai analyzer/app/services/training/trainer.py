import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
import numpy as np
import torch
import torch.nn as nn
from monai.networks.nets import UNet
from monai.losses import DiceCELoss
from monai.inferers import sliding_window_inference
from monai.metrics import DiceMetric, MeanIoU
from monai.transforms import AsDiscrete

from app.services.segmentation.config import get_torch_device
from app.services.training.config import TrainingConfig


class SegmentationTrainer:
    """
    Reproducible Training Engine for KneeAI 2D/3D U-Net Segmentation.
    """

    def __init__(self, config: Optional[TrainingConfig] = None):
        self.config = config or TrainingConfig()
        self.device = get_torch_device(self.config.device)
        self.spatial_dims = getattr(self.config, "spatial_dims", 2 if "2d" in self.config.model_type else 3)

        # Initialize network
        self.model = UNet(
            spatial_dims=self.spatial_dims,
            in_channels=self.config.in_channels,
            out_channels=self.config.num_classes,
            channels=self.config.channels,
            strides=self.config.strides,
            num_res_units=self.config.num_res_units,
            norm="batch",
        ).to(self.device)

        # Loss Function: Combined Dice + Cross-Entropy Loss
        self.loss_function = DiceCELoss(to_onehot_y=True, softmax=True)

        # Optimizer
        self.optimizer = torch.optim.AdamW(
            self.model.parameters(),
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
        )

        # Metrics
        self.dice_metric = DiceMetric(include_background=False, reduction="mean_batch")
        self.iou_metric = MeanIoU(include_background=False, reduction="mean_batch")
        self.post_label = AsDiscrete(to_onehot=self.config.num_classes)
        self.post_pred = AsDiscrete(argmax=True, to_onehot=self.config.num_classes)

        self.best_val_dice = -1.0
        self.start_epoch = 1
        self.history: Dict[str, List[Any]] = {
            "train_loss": [],
            "val_loss": [],
            "val_dice": [],
            "val_iou": [],
            "per_class_metrics": [],
        }

        # Checkpoint directory
        self.config.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        # Resume if requested
        if self.config.resume:
            latest_ckpt = self.config.checkpoint_dir / "latest_model.pth"
            if latest_ckpt.exists():
                self.load_checkpoint(latest_ckpt)

    def save_checkpoint(self, filepath: Path, is_best: bool = False) -> None:
        """Save training state checkpoint."""
        filepath.parent.mkdir(parents=True, exist_ok=True)
        checkpoint = {
            "epoch": self.start_epoch,
            "best_val_dice": self.best_val_dice,
            "state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "config": {
                "model_type": self.config.model_type,
                "spatial_dims": self.spatial_dims,
                "num_classes": self.config.num_classes,
                "class_mapping": self.config.class_mapping,
            },
            "history": self.history,
        }
        torch.save(checkpoint, str(filepath))
        if is_best:
            best_path = self.config.checkpoint_dir / "best_model.pth"
            torch.save(checkpoint, str(best_path))

    def load_checkpoint(self, filepath: Path) -> bool:
        """Load checkpoint and resume training state."""
        if not filepath.exists():
            return False
        try:
            checkpoint = torch.load(str(filepath), map_location=self.device, weights_only=False)
            self.model.load_state_dict(checkpoint["state_dict"])
            if "optimizer_state_dict" in checkpoint:
                self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
            self.start_epoch = checkpoint.get("epoch", 1)
            self.best_val_dice = checkpoint.get("best_val_dice", -1.0)
            self.history = checkpoint.get("history", self.history)
            return True
        except Exception:
            return False

    def train_epoch(self, train_loader) -> float:
        """Execute one training epoch."""
        self.model.train()
        epoch_loss = 0.0
        step_count = 0

        for batch_data in train_loader:
            inputs = batch_data["image"].to(self.device)
            labels = batch_data["mask"].to(self.device)

            self.optimizer.zero_grad()
            outputs = self.model(inputs)
            loss = self.loss_function(outputs, labels)
            loss.backward()
            self.optimizer.step()

            epoch_loss += loss.item()
            step_count += 1

        return epoch_loss / max(1, step_count)

    def validate_epoch(self, val_loader) -> Tuple[float, float, float, Dict[str, float]]:
        """
        Execute validation and compute class metrics.
        """
        self.model.eval()
        self.dice_metric.reset()
        self.iou_metric.reset()
        val_loss = 0.0
        step_count = 0

        with torch.no_grad():
            for batch_data in val_loader:
                inputs = batch_data["image"].to(self.device)
                labels = batch_data["mask"].to(self.device)

                if self.spatial_dims == 3:
                    roi_size = getattr(self.config, "patch_size_3d", (96, 96, 32))
                    outputs = sliding_window_inference(
                        inputs, roi_size=roi_size, sw_batch_size=2, predictor=self.model, overlap=0.25
                    )
                else:
                    outputs = self.model(inputs)

                loss = self.loss_function(outputs, labels)
                val_loss += loss.item()
                step_count += 1

                # Compute Dice and IoU
                val_outputs = [self.post_pred(i) for i in outputs]
                val_labels = [self.post_label(i) for i in labels]

                self.dice_metric(y_pred=val_outputs, y=val_labels)
                self.iou_metric(y_pred=val_outputs, y=val_labels)

        avg_loss = val_loss / max(1, step_count)
        per_class_dice_t = self.dice_metric.aggregate()
        per_class_iou_t = self.iou_metric.aggregate()

        per_class_dice_arr = np.atleast_1d(per_class_dice_t.cpu().numpy())
        per_class_iou_arr = np.atleast_1d(per_class_iou_t.cpu().numpy())

        mean_dice = float(np.nanmean(per_class_dice_arr))
        mean_iou = float(np.nanmean(per_class_iou_arr))

        # Map per class results (excluding background)
        per_class_metrics = {}
        target_structures = [name for cid, name in sorted(self.config.class_mapping.items()) if cid != 0]
        for idx, name in enumerate(target_structures):
            if idx < len(per_class_dice_arr):
                per_class_metrics[f"{name}_dice"] = float(per_class_dice_arr[idx])
                per_class_metrics[f"{name}_iou"] = float(per_class_iou_arr[idx])

        return avg_loss, mean_dice, mean_iou, per_class_metrics

    def fit(self, train_loader, val_loader) -> Dict[str, Any]:
        """Run complete multi-epoch training and validation loop."""
        print(f"[+] Starting Training: {self.config.num_epochs} Epochs on Device: {self.device}")
        
        for epoch in range(self.start_epoch, self.config.num_epochs + 1):
            t0 = time.time()
            train_loss = self.train_epoch(train_loader)
            val_loss, val_dice, val_iou, per_class = self.validate_epoch(val_loader)
            elapsed = time.time() - t0

            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["val_dice"].append(val_dice)
            self.history["val_iou"].append(val_iou)
            self.history["per_class_metrics"].append(per_class)

            is_best = val_dice > self.best_val_dice
            if is_best:
                self.best_val_dice = val_dice
                self.save_checkpoint(self.config.checkpoint_dir / "best_model.pth", is_best=True)

            self.save_checkpoint(self.config.checkpoint_dir / "latest_model.pth", is_best=False)

            history_path = self.config.checkpoint_dir / "training_history.json"
            with open(history_path, "w", encoding="utf-8") as f:
                json.dump(self.history, f, indent=2)

            print(
                f"Epoch {epoch:03d}/{self.config.num_epochs:03d} | "
                f"Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | "
                f"Val Dice: {val_dice:.4f} | Val IoU: {val_iou:.4f} | "
                f"{'(*) BEST' if is_best else ''} ({elapsed:.1f}s)"
            )

        return {
            "status": "completed",
            "best_val_dice": self.best_val_dice,
            "best_model_path": str((self.config.checkpoint_dir / "best_model.pth").resolve()),
            "history_path": str((self.config.checkpoint_dir / "training_history.json").resolve()),
        }

    def evaluate_test_set(self, test_loader) -> Dict[str, Any]:
        """Evaluate final performance on untouched test split."""
        best_ckpt = self.config.checkpoint_dir / "best_model.pth"
        if best_ckpt.exists():
            self.load_checkpoint(best_ckpt)

        test_loss, mean_dice, mean_iou, per_class = self.validate_epoch(test_loader)
        return {
            "test_loss": test_loss,
            "mean_dice": mean_dice,
            "mean_iou": mean_iou,
            "per_class_metrics": per_class,
        }
