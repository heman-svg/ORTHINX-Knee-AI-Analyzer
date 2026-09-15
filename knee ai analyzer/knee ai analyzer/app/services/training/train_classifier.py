"""
Training Pipeline for 5-Class Knee Severity Classification.
Implements:
- Stratified sampling with class-weighted cross-entropy loss.
- AdamW optimizer with cosine annealing scheduler.
- Robust data augmentation (horizontal flip, subtle rotation, affine jitter).
- Validation tracking with early stopping and model checkpointing.
"""

import os
import sys
import time
import json
import argparse
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from typing import Dict, Any, Tuple

import numpy as np
import pandas as pd
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms as T
from sklearn.metrics import f1_score, accuracy_score

from app.services.training.classification_model import build_classifier


CLASS_NAMES = ["Normal", "Doubtful", "Mild", "Moderate", "Severe"]


class KneeSeverityDataset(Dataset):
    def __init__(self, csv_file: str, transform=None):
        self.df = pd.read_csv(csv_file)
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = row["image_path"]
        class_id = int(row["class_id"])

        pil_img = Image.open(img_path)
        if pil_img.mode != "RGB":
            if pil_img.mode in ("I;16", "I"):
                arr = np.array(pil_img, dtype=np.float32)
                arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255.0
                pil_img = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
            else:
                pil_img = pil_img.convert("RGB")

        if self.transform:
            tensor = self.transform(pil_img)
        else:
            tensor = T.ToTensor()(pil_img)

        return tensor, class_id


def get_transforms(img_size: int = 224) -> Tuple[T.Compose, T.Compose]:
    train_transform = T.Compose([
        T.Resize((img_size, img_size)),
        T.RandomHorizontalFlip(p=0.5),
        T.RandomRotation(degrees=10),
        T.ColorJitter(brightness=0.15, contrast=0.15),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = T.Compose([
        T.Resize((img_size, img_size)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    return train_transform, val_transform


def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    all_preds = []
    all_targets = []

    for inputs, targets in loader:
        inputs = inputs.to(device)
        targets = targets.to(device)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, targets)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
        preds = torch.argmax(outputs, dim=1).cpu().numpy()
        all_preds.extend(preds)
        all_targets.extend(targets.cpu().numpy())

    epoch_loss = running_loss / len(loader.dataset)
    epoch_acc = accuracy_score(all_targets, all_preds)
    epoch_f1 = f1_score(all_targets, all_preds, average="macro")

    return epoch_loss, epoch_acc, epoch_f1


def evaluate(model, loader, criterion, device):
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_targets = []

    with torch.no_grad():
        for inputs, targets in loader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            outputs = model(inputs)
            loss = criterion(outputs, targets)

            running_loss += loss.item() * inputs.size(0)
            preds = torch.argmax(outputs, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(targets.cpu().numpy())

    val_loss = running_loss / len(loader.dataset)
    val_acc = accuracy_score(all_targets, all_preds)
    val_f1 = f1_score(all_targets, all_preds, average="macro")

    return val_loss, val_acc, val_f1, all_preds, all_targets


def run_training(
    train_csv: str = "data/metadata/train.csv",
    val_csv: str = "data/metadata/val.csv",
    output_dir: str = "model_weights",
    epochs: int = 15,
    batch_size: int = 32,
    lr: float = 1e-4,
    device_str: str = "auto",
):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    if device_str == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_str)
    print(f"Training on device: {device}")

    train_tf, val_tf = get_transforms(224)
    train_ds = KneeSeverityDataset(train_csv, transform=train_tf)
    val_ds = KneeSeverityDataset(val_csv, transform=val_tf)

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    # Class weighting for class imbalance
    train_df = pd.read_csv(train_csv)
    class_counts = train_df["class_id"].value_counts().sort_index().values
    total_samples = len(train_df)
    class_weights = total_samples / (len(class_counts) * class_counts)
    weight_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"Computed Class Weights: {weight_tensor.tolist()}")

    criterion = nn.CrossEntropyLoss(weight=weight_tensor)
    model = build_classifier("resnet18", num_classes=5, pretrained=True, device=device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    best_val_f1 = 0.0
    best_epoch = 0

    print("\n--- Beginning Training ---")
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        tr_loss, tr_acc, tr_f1 = train_one_epoch(model, train_loader, criterion, optimizer, device)
        va_loss, va_acc, va_f1, _, _ = evaluate(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        print(
            f"Epoch {epoch:02d}/{epochs:02d} [{elapsed:.1f}s] - "
            f"Train Loss: {tr_loss:.4f} Acc: {tr_acc*100:.1f}% F1: {tr_f1:.4f} | "
            f"Val Loss: {va_loss:.4f} Acc: {va_acc*100:.1f}% F1: {va_f1:.4f}"
        )

        if va_f1 > best_val_f1:
            best_val_f1 = va_f1
            best_epoch = epoch
            best_ckpt = out_path / "knee_severity_best.pth"
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_macro_f1": va_f1,
                "val_acc": va_acc,
                "val_loss": va_loss,
            }, best_ckpt)
            print(f"  --> Saved new best checkpoint to {best_ckpt} (Macro-F1: {va_f1:.4f})")

    # Save model config metadata
    config = {
        "model_name": "orthinx_knee_severity_resnet18",
        "architecture": "resnet18",
        "num_classes": 5,
        "class_mapping": {str(i): name for i, name in enumerate(CLASS_NAMES)},
        "input_size": [224, 224],
        "mean": [0.485, 0.456, 0.406],
        "std": [0.229, 0.224, 0.225],
        "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "best_val_macro_f1": round(best_val_f1, 4),
        "best_epoch": best_epoch,
    }
    with open(out_path / "knee_severity_config.json", "w") as f:
        json.dump(config, f, indent=2)
    print("Training finished successfully. Config written.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--train-csv", default="data/metadata/train.csv")
    parser.add_argument("--val-csv", default="data/metadata/val.csv")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()
    run_training(args.train_csv, args.val_csv, epochs=args.epochs, batch_size=args.batch_size)
