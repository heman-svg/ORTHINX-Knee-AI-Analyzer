from pathlib import Path
from typing import List, Dict, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project Root Directory
BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    APP_NAME: str = "KneeAI Backend"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite:///./kneeai.db"

    # Storage paths relative to project root
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    PROCESSED_DIR: Path = BASE_DIR / "data" / "processed"
    RESULTS_DIR: Path = BASE_DIR / "data" / "results"
    MODEL_DIR: Path = BASE_DIR / "model_weights"

    # Upload validation configuration
    MAX_UPLOAD_SIZE_MB: int = 250
    ALLOWED_EXTENSIONS: List[str] = [
        ".nii",
        ".nii.gz",
        ".dcm",
        ".png",
        ".jpg",
        ".jpeg",
        ".mha",
    ]

    # Dataset Settings
    DATASET_DIR: Path = BASE_DIR / "data" / "dataset"
    CGMH_DATASET_ROOT: Path = Path(r"C:\Users\heman\Downloads\archive\CGMH_KneeSegment")

    # Segmentation & Preprocessing Defaults
    SEGMENTATION_MODEL_NAME: str = "knee_unet_2d"
    SEGMENTATION_WEIGHTS_FILE: Optional[str] = "best_model.pth"
    DEVICE: str = "auto"  # "auto" uses CUDA if available, else CPU
    NUM_SEGMENTATION_CLASSES: int = 4
    CLASS_MAPPING: Dict[int, str] = {
        0: "background",
        1: "femur",
        2: "tibia",
        3: "meniscus",
    }

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def init_directories(self) -> None:
        """Ensure all storage directories exist."""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        self.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        self.MODEL_DIR.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.init_directories()
