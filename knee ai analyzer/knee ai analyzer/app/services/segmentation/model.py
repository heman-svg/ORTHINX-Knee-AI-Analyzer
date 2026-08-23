from pathlib import Path
from typing import Optional, Dict, Any
import torch
import torch.nn as nn
from monai.networks.nets import UNet

from app.services.segmentation.config import SegmentationConfig, get_torch_device


class SegmentationModel:
    """
    Modular Medical AI Segmentation Engine for Knee MRI/Radiographs.
    Wraps MONAI U-Net (2D and 3D) architectures with lazy network initialization,
    decoupled weight loading, and dynamic architecture detection.
    """

    def __init__(self, config: Optional[SegmentationConfig] = None):
        self.config = config or SegmentationConfig()
        self.device = get_torch_device(self.config.device)
        self.spatial_dims = 3 if "3d" in self.config.model_type else 2
        
        self.network: Optional[nn.Module] = None
        self.weights_loaded: bool = False
        self.weights_file: Optional[str] = None

        # Attempt to load weights if configured and present
        if self.config.weights_path:
            self.load_weights(self.config.weights_path)

    def _build_network(self) -> nn.Module:
        """Lazily instantiate the MONAI U-Net neural network module."""
        if self.network is None:
            self.network = UNet(
                spatial_dims=self.spatial_dims,
                in_channels=self.config.in_channels,
                out_channels=self.config.num_classes,
                channels=self.config.channels,
                strides=self.config.strides,
                num_res_units=self.config.num_res_units,
                norm="batch",
            ).to(self.device)
        return self.network

    def load_weights(self, weights_path: str | Path) -> bool:
        """
        Safely load model weights from disk and adapt network architecture dynamically.
        Returns True if successful, False if file does not exist or loading fails.
        """
        path = Path(weights_path)
        if not path.exists() or not path.is_file():
            self.weights_loaded = False
            self.weights_file = None
            return False

        try:
            try:
                state = torch.load(str(path), map_location=self.device, weights_only=False)
            except Exception:
                state = torch.load(str(path), map_location=self.device)

            state_dict = state
            if isinstance(state, dict):
                if "model_state_dict" in state:
                    state_dict = state["model_state_dict"]
                elif "state_dict" in state:
                    state_dict = state["state_dict"]

            # Inspect state_dict to dynamically detect spatial_dims and num_classes
            first_conv_key = next((k for k in state_dict.keys() if "conv" in k and "weight" in k), None)
            if first_conv_key:
                first_weight = state_dict[first_conv_key]
                if first_weight.ndim == 4:
                    self.spatial_dims = 2
                    self.config.model_type = "monai_unet_2d"
                elif first_weight.ndim == 5:
                    self.spatial_dims = 3
                    self.config.model_type = "monai_unet_3d"

            # Detect output classes from final convolution / out_tr
            last_conv_key = next((k for k in reversed(list(state_dict.keys())) if "conv" in k and "weight" in k or "out_tr" in k), None)
            if last_conv_key:
                out_channels = state_dict[last_conv_key].shape[0]
                self.config.num_classes = out_channels
                if out_channels == 2:
                    self.config.class_mapping = {0: "background", 1: "knee_joint"}
                elif out_channels == 4:
                    self.config.class_mapping = {0: "background", 1: "femur", 2: "tibia", 3: "meniscus"}

            # Rebuild network with exact detected dimensions
            self.network = None
            net = self._build_network()
            net.load_state_dict(state_dict)
            net.eval()

            self.weights_loaded = True
            self.weights_file = str(path.resolve())
            return True
        except Exception as e:
            self.weights_loaded = False
            self.weights_file = None
            return False

    def is_available(self) -> bool:
        """Check whether trained weights are loaded and ready for inference."""
        return self.weights_loaded

    def get_status(self) -> Dict[str, Any]:
        """Return clear, non-fabricated status of the segmentation model."""
        return {
            "model_available": self.weights_loaded,
            "model_type": self.config.model_type,
            "spatial_dims": self.spatial_dims,
            "num_classes": self.config.num_classes,
            "classes": self.config.class_mapping,
            "device": str(self.device),
            "cuda_available": torch.cuda.is_available(),
            "weights_file": self.weights_file,
            "message": (
                "Trained segmentation weights are active."
                if self.weights_loaded
                else "Trained segmentation weights are not available."
            ),
        }

    def predict(self, input_tensor: torch.Tensor) -> torch.Tensor:
        """
        Execute forward pass on input tensor.
        Expected shape: (Batch, Channels, *SpatialDims) e.g. (1, 1, H, W, D) or (1, 1, H, W).
        Returns logits tensor of shape (Batch, NumClasses, *SpatialDims).
        """
        if not self.weights_loaded:
            raise RuntimeError("Cannot run inference: Segmentation model weights are not loaded.")

        net = self._build_network()
        net.eval()
        with torch.no_grad():
            tensor_device = input_tensor.to(self.device)
            logits = net(tensor_device)
            return logits
