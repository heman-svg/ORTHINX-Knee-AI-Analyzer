from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Optional, Literal
import torch
from app.core.config import settings


def get_torch_device(configured_device: str = "auto") -> torch.device:
    """
    Resolve PyTorch compute device:
    - 'auto': utilizes CUDA if a compatible GPU is found, otherwise gracefully falls back to CPU.
    - 'cuda': forces CUDA (falls back to CPU if not available).
    - 'cpu': forces CPU execution.
    """
    if configured_device.lower() == "cpu":
        return torch.device("cpu")
    elif configured_device.lower() == "cuda":
        if torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")
    else:  # auto
        if torch.cuda.is_available():
            return torch.device("cuda")
        return torch.device("cpu")


@dataclass
class SegmentationConfig:
    """
    Configuration for Knee Segmentation Engine.
    NOTE: The class mapping must strictly match the training dataset annotation schema.
    """
    num_classes: int = 4
    class_mapping: Dict[int, str] = field(
        default_factory=lambda: {
            0: "background",
            1: "femur",
            2: "tibia",
            3: "meniscus",
        }
    )
    model_type: Literal["monai_unet_3d", "monai_unet_2d", "pytorch_unet_3d"] = "monai_unet_3d"
    weights_path: Optional[Path] = None
    device: str = "auto"
    in_channels: int = 1
    channels: tuple = (16, 32, 64, 128, 256)
    strides: tuple = (2, 2, 2, 2)
    num_res_units: int = 2
