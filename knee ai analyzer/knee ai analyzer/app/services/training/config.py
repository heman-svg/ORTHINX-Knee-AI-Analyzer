from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Tuple, Optional
from app.core.config import settings, BASE_DIR


@dataclass
class TrainingConfig:
    """
    Hyperparameter and pipeline configuration for KneeAI segmentation model training.
    Supports both 2D radiograph datasets (CGMH KneeSeg) and 3D volumetric MRI datasets.
    """
    # Dataset path (defaults to CGMH if present, otherwise local dataset folder)
    data_dir: Path = settings.CGMH_DATASET_ROOT if settings.CGMH_DATASET_ROOT.exists() else settings.DATASET_DIR
    splits_dir: Path = BASE_DIR / "data" / "splits"
    checkpoint_dir: Path = settings.MODEL_DIR

    # 2D CGMH KneeSeg Configuration
    model_type: str = "monai_unet_2d"  # "monai_unet_2d" or "monai_unet_3d"
    spatial_dims: int = 2
    num_classes: int = 2  # 0: background, 1: knee_joint
    class_mapping: Dict[int, str] = field(
        default_factory=lambda: {
            0: "background",
            1: "knee_joint",
        }
    )
    in_channels: int = 1
    channels: Tuple[int, ...] = (16, 32, 64, 128, 256)
    strides: Tuple[int, ...] = (2, 2, 2, 2)
    num_res_units: int = 2

    # Optimization
    learning_rate: float = 1e-4
    weight_decay: float = 1e-5
    batch_size: int = 4
    num_epochs: int = 50
    val_interval: int = 1
    num_workers: int = 0  # Safe for Windows multiprocessing

    # 2D Spatial Resolution
    spatial_size_2d: Tuple[int, int] = (512, 512)

    # 3D Patch Sampling (Preserved for volumetric MRI datasets)
    patch_size_3d: Tuple[int, int, int] = (96, 96, 32)
    num_samples_per_volume: int = 4

    # Patient-level Split
    random_seed: int = 42
    train_ratio: float = 0.70
    val_ratio: float = 0.15
    test_ratio: float = 0.15

    # Compute
    device: str = "auto"
    resume: bool = False
