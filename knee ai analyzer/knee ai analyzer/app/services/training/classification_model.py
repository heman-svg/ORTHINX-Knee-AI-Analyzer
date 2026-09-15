"""
Model Architecture Definition for 5-Class Knee Severity Classification.
Supports Transfer Learning backbones (ResNet18, ResNet50, DenseNet121, EfficientNet)
adapted for 5 severity grades: Normal (0), Doubtful (1), Mild (2), Moderate (3), Severe (4).
"""

from pathlib import Path
from typing import Optional, Dict, Any
import torch
import torch.nn as nn
import torchvision.models as models


class KneeClassificationModel(nn.Module):
    def __init__(
        self,
        architecture: str = "resnet18",
        num_classes: int = 5,
        pretrained: bool = False,
        dropout_p: float = 0.3,
    ):
        super().__init__()
        self.architecture = architecture.lower()
        self.num_classes = num_classes
        self.dropout_p = dropout_p
        
        if self.architecture == "resnet18":
            weights = models.ResNet18_Weights.DEFAULT if pretrained else None
            base = models.resnet18(weights=weights)
            in_features = base.fc.in_features
            base.fc = nn.Sequential(
                nn.Dropout(p=dropout_p),
                nn.Linear(in_features, num_classes),
            )
            self.backbone = base
        elif self.architecture == "resnet50":
            weights = models.ResNet50_Weights.DEFAULT if pretrained else None
            base = models.resnet50(weights=weights)
            in_features = base.fc.in_features
            base.fc = nn.Sequential(
                nn.Dropout(p=dropout_p),
                nn.Linear(in_features, num_classes),
            )
            self.backbone = base
        elif self.architecture == "densenet121":
            weights = models.DenseNet121_Weights.DEFAULT if pretrained else None
            base = models.densenet121(weights=weights)
            in_features = base.classifier.in_features
            base.classifier = nn.Sequential(
                nn.Dropout(p=dropout_p),
                nn.Linear(in_features, num_classes),
            )
            self.backbone = base
        else:
            raise ValueError(f"Unsupported architecture: {architecture}")

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def get_probabilities(self, x: torch.Tensor) -> torch.Tensor:
        logits = self.forward(x)
        return torch.softmax(logits, dim=1)

    def load_weights(self, weights_path_or_dict, strict: bool = True):
        if isinstance(weights_path_or_dict, (str, Path)):
            checkpoint = torch.load(str(weights_path_or_dict), map_location="cpu")
        else:
            checkpoint = weights_path_or_dict

        state_dict = checkpoint.get("state_dict", checkpoint.get("model_state_dict", checkpoint))

        # Check if keys start with backbone. or not
        has_backbone_prefix = any(k.startswith("backbone.") for k in state_dict.keys())
        if has_backbone_prefix:
            self.load_state_dict(state_dict, strict=strict)
        else:
            self.backbone.load_state_dict(state_dict, strict=strict)


def build_classifier(
    architecture: str = "resnet18",
    num_classes: int = 5,
    pretrained: bool = False,
    dropout_p: float = 0.3,
    device: Optional[torch.device] = None,
) -> KneeClassificationModel:
    model = KneeClassificationModel(
        architecture=architecture,
        num_classes=num_classes,
        pretrained=pretrained,
        dropout_p=dropout_p,
    )
    if device:
        model = model.to(device)
    return model
