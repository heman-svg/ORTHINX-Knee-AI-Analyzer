"""KneeAI Model Training & Dataset Integration Package."""
from app.services.training.config import TrainingConfig
from app.services.training.dataset import (
    find_and_pair_samples,
    create_patient_splits,
    load_split_csv,
    validate_image_mask_pair,
)
from app.services.training.cgmh_adapter import CGMHKneeSegAdapter
from app.services.training.monai_dataset import (
    get_training_transforms,
    get_validation_transforms,
    get_2d_training_transforms,
    get_2d_validation_transforms,
    get_3d_training_transforms,
    get_3d_validation_transforms,
    create_monai_dataloaders,
)
from app.services.training.trainer import SegmentationTrainer
from app.services.training.visualization import (
    create_segmentation_overlay,
    save_triplet_visualization,
)

__all__ = [
    "TrainingConfig",
    "CGMHKneeSegAdapter",
    "find_and_pair_samples",
    "create_patient_splits",
    "load_split_csv",
    "validate_image_mask_pair",
    "get_training_transforms",
    "get_validation_transforms",
    "get_2d_training_transforms",
    "get_2d_validation_transforms",
    "get_3d_training_transforms",
    "get_3d_validation_transforms",
    "create_monai_dataloaders",
    "SegmentationTrainer",
    "create_segmentation_overlay",
    "save_triplet_visualization",
]
