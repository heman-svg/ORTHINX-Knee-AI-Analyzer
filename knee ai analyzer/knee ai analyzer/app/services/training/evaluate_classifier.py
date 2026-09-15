"""
Comprehensive Test Evaluation Script for 5-Class Knee Severity Classifier.
Evaluates on untouched test split (data/metadata/test.csv).
Computes:
- Overall Accuracy & Balanced Accuracy
- Macro & Weighted Precision, Recall, F1
- Per-class metrics table
- Visual and numeric Confusion Matrix
Saves results to data/validation_results/.
"""

import json
import sys
import os
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)
import matplotlib.pyplot as plt

from app.services.training.classification_model import build_classifier
from app.services.training.train_classifier import KneeSeverityDataset, get_transforms, CLASS_NAMES


def evaluate_test_set(
    test_csv: str = "data/metadata/test.csv",
    weights_path: str = "model_weights/knee_severity_best.pth",
    output_dir: str = "data/validation_results",
    device_str: str = "auto",
):
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    if device_str == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_str)

    print(f"Evaluating test set on: {device}")
    _, test_tf = get_transforms(224)
    test_ds = KneeSeverityDataset(test_csv, transform=test_tf)
    test_loader = DataLoader(test_ds, batch_size=32, shuffle=False, num_workers=0)

    # Load model
    model = build_classifier("resnet18", num_classes=5, pretrained=False, device=device)
    model.load_weights(weights_path)
    model.to(device)
    model.eval()

    all_preds = []
    all_targets = []
    all_probs = []

    with torch.no_grad():
        for inputs, targets in test_loader:
            inputs = inputs.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1).cpu().numpy()
            preds = np.argmax(probs, axis=1)

            all_preds.extend(preds)
            all_targets.extend(targets.numpy())
            all_probs.extend(probs)

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    # Metrics computation
    acc = float(accuracy_score(all_targets, all_preds))
    bal_acc = float(balanced_accuracy_score(all_targets, all_preds))
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="macro")
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(all_targets, all_preds, average="weighted")

    per_p, per_r, per_f1, per_support = precision_recall_fscore_support(all_targets, all_preds, average=None)

    cm = confusion_matrix(all_targets, all_preds, labels=list(range(len(CLASS_NAMES))))

    per_class_results = {}
    csv_rows = []
    for i, name in enumerate(CLASS_NAMES):
        per_class_results[name] = {
            "class_id": i,
            "precision": round(float(per_p[i]), 4),
            "recall": round(float(per_r[i]), 4),
            "f1_score": round(float(per_f1[i]), 4),
            "support": int(per_support[i]),
        }
        csv_rows.append({
            "class_name": name,
            "class_id": i,
            "precision": round(float(per_p[i]), 4),
            "recall": round(float(per_r[i]), 4),
            "f1_score": round(float(per_f1[i]), 4),
            "support": int(per_support[i]),
        })

    # Summary JSON
    results = {
        "test_samples_count": len(all_targets),
        "accuracy": round(acc, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "weighted_f1": round(float(weighted_f1), 4),
        "per_class_metrics": per_class_results,
        "confusion_matrix": cm.tolist(),
        "class_names": CLASS_NAMES,
    }

    json_path = out_path / "classification_test_results.json"
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)

    # Metrics CSV
    csv_path = out_path / "classification_metrics.csv"
    pd.DataFrame(csv_rows).to_csv(csv_path, index=False)

    # Render visual confusion matrix
    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)
    im = ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)
    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=CLASS_NAMES,
        yticklabels=CLASS_NAMES,
        title="Knee Severity Confusion Matrix (Test Set)",
        ylabel="True Severity Grade",
        xlabel="Predicted Severity Grade",
    )
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, format(cm[i, j], "d"),
                ha="center", va="center",
                color="white" if cm[i, j] > thresh else "black"
            )
    fig.tight_layout()
    cm_path = out_path / "confusion_matrix.png"
    plt.savefig(cm_path)
    plt.close()

    print("\n--- Test Set Evaluation Results ---")
    print(f"Total Samples:      {len(all_targets)}")
    print(f"Accuracy:           {acc * 100:.2f}%")
    print(f"Balanced Accuracy:  {bal_acc * 100:.2f}%")
    print(f"Macro F1-Score:     {macro_f1:.4f}")
    print(f"Weighted F1-Score:  {weighted_f1:.4f}")
    print("\nPer-Class Breakdown:")
    for name, m in per_class_results.items():
        print(f"  {name:10s} (N={m['support']:3d}) -> Precision: {m['precision']:.3f} | Recall: {m['recall']:.3f} | F1: {m['f1_score']:.3f}")
    print(f"\nArtifacts saved to {output_dir}/")
    return results


if __name__ == "__main__":
    evaluate_test_set()
