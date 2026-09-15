from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from pathlib import Path


class ClassificationConfig(BaseModel):
    model_name: str = "orthinx_knee_severity_resnet18"
    architecture: str = "resnet18"
    num_classes: int = 5
    class_mapping: Dict[int, str] = {
        0: "Normal",
        1: "Doubtful",
        2: "Mild",
        3: "Moderate",
        4: "Severe",
    }
    input_size: List[int] = [224, 224]
    mean: List[float] = [0.485, 0.456, 0.406]
    std: List[float] = [0.229, 0.224, 0.225]
    weights_filename: str = "knee_severity_best.pth"
    device: str = "cpu"
