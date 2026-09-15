import os
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms as T
from PIL import Image
import numpy as np

from app.core.config import settings
from app.services.classification.config import ClassificationConfig


class KneeSeverityClassifier:
    """
    PyTorch-based 5-class Knee Severity Classifier (Normal, Doubtful, Mild, Moderate, Severe).
    """
    def __init__(self, weights_path: Optional[Path] = None, device: Optional[str] = None):
        self.config = ClassificationConfig()
        if not device or str(device).lower() == "auto":
            dev_str = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            dev_str = device
        self.device = torch.device(dev_str)
        self.weights_path = weights_path or (settings.MODEL_DIR / self.config.weights_filename)
        self.model: Optional[nn.Module] = None
        self.weights_loaded: bool = False
        self.class_names = ["Normal", "Doubtful", "Mild", "Moderate", "Severe"]

        self.transform = T.Compose([
            T.Resize((self.config.input_size[0], self.config.input_size[1])),
            T.ToTensor(),
            T.Normalize(mean=self.config.mean, std=self.config.std),
        ])

        self._build_model()
        if self.weights_path.exists():
            self.load_weights(self.weights_path)

    def _build_model(self):
        # ResNet18 architecture matching trained checkpoint
        base_model = models.resnet18(weights=None)
        in_features = base_model.fc.in_features
        base_model.fc = nn.Sequential(
            nn.Dropout(p=0.3),
            nn.Linear(in_features, self.config.num_classes)
        )
        self.model = base_model.to(self.device)
        self.model.eval()

    def load_weights(self, weights_path: Path):
        try:
            checkpoint = torch.load(str(weights_path), map_location=self.device)
            state_dict = checkpoint.get("state_dict", checkpoint)
            self.model.load_state_dict(state_dict, strict=True)
            self.weights_loaded = True
            self.model.eval()
            print(f"Loaded Knee Severity Classifier weights from {weights_path}")
        except Exception as e:
            print(f"Error loading classifier weights from {weights_path}: {e}")
            self.weights_loaded = False

    def is_available(self) -> bool:
        return self.weights_loaded and self.model is not None

    def predict_image(self, pil_image: Image.Image) -> Dict[str, Any]:
        """
        Run forward pass on PIL image and return structured prediction details.
        """
        if not self.is_available():
            raise RuntimeError("Knee Severity Classifier weights are not loaded.")

        # Ensure RGB
        if pil_image.mode != "RGB":
            if pil_image.mode in ("I;16", "I"):
                arr = np.array(pil_image, dtype=np.float32)
                arr = (arr - arr.min()) / (arr.max() - arr.min() + 1e-8) * 255.0
                pil_image = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
            else:
                pil_image = pil_image.convert("RGB")

        tensor = self.transform(pil_image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self.model(tensor)
            probs = torch.softmax(logits, dim=1).cpu().numpy()[0]
            pred_id = int(np.argmax(probs))
            confidence = float(probs[pred_id])

        prob_dict = {
            self.class_names[i]: round(float(probs[i]), 4)
            for i in range(len(self.class_names))
        }

        return {
            "class_id": pred_id,
            "class_name": self.class_names[pred_id],
            "confidence": round(confidence, 4),
            "probabilities": prob_dict,
            "model_version": self.config.model_name,
            "architecture": self.config.architecture,
        }
