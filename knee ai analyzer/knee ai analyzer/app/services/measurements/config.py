"""
Configuration parameters for Native-Space Knee Joint Measurement and Quality Assessment.
"""

from typing import Tuple
from pydantic import BaseModel, Field


class MeasurementConfig(BaseModel):
    """Configurable thresholds and options for Stage 9 measurement pipeline."""

    # Target canvas size used by MONAI model
    model_canvas_size: Tuple[int, int] = (512, 512)

    # Connected component quality thresholds
    min_foreground_pixels_native: int = Field(
        100, description="Minimum acceptable native foreground pixels before failing as empty/too small"
    )
    max_components_warning: int = Field(
        4, description="Component count exceeding this triggers a WARNING quality flag"
    )
    max_components_fail: int = Field(
        10, description="Component count exceeding this triggers an INVALID quality flag"
    )
    min_dominant_components_ratio: float = Field(
        0.80, description="Top 2 dominant compartments combined must contain at least this fraction of total foreground"
    )

    # JSW sampling parameters
    min_jsw_samples: int = Field(
        10, description="Minimum valid horizontal cross-sections required for a valid JSW profile"
    )
    margin_trim_ratio: float = Field(
        0.05, description="Fraction of peripheral left/right margin to trim from extreme edges"
    )

    # Area sanity thresholds (percentage of native image)
    min_area_percentage: float = Field(0.01, description="Minimum plausible knee joint area %")
    max_area_percentage: float = Field(35.0, description="Maximum plausible knee joint area %")

    # Output directories
    measurements_dir_name: str = "measurements"


default_measurement_config = MeasurementConfig()
