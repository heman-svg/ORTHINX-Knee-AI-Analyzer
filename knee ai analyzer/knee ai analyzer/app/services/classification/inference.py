from pathlib import Path
from typing import Dict, Any, Optional
from PIL import Image
import numpy as np

from app.core.config import settings
from app.services.classification.model import KneeSeverityClassifier

_DEFAULT_CLASSIFIER: Optional[KneeSeverityClassifier] = None


def get_default_classifier() -> KneeSeverityClassifier:
    global _DEFAULT_CLASSIFIER
    if _DEFAULT_CLASSIFIER is None:
        weights_path = settings.MODEL_DIR / "knee_severity_best.pth"
        _DEFAULT_CLASSIFIER = KneeSeverityClassifier(weights_path=weights_path, device=settings.DEVICE)
    elif not _DEFAULT_CLASSIFIER.is_available():
        weights_path = settings.MODEL_DIR / "knee_severity_best.pth"
        if weights_path.exists():
            _DEFAULT_CLASSIFIER.load_weights(weights_path)
    return _DEFAULT_CLASSIFIER


def predict_knee_severity(image_input) -> Dict[str, Any]:
    """
    Accepts PIL Image, numpy array, or file path and returns 5-class severity prediction.
    """
    classifier = get_default_classifier()
    if not classifier.is_available():
        return {
            "class_id": None,
            "class_name": "Unknown",
            "confidence": 0.0,
            "probabilities": {},
            "model_version": "unavailable",
            "status": "model_unavailable",
            "message": "Knee severity classification model checkpoint is not loaded.",
        }

    if isinstance(image_input, (str, Path)):
        pil_img = Image.open(str(image_input))
    elif isinstance(image_input, np.ndarray):
        if image_input.max() <= 1.0:
            image_input = (image_input * 255.0).astype(np.uint8)
        else:
            image_input = image_input.astype(np.uint8)
        pil_img = Image.fromarray(image_input)
    elif isinstance(image_input, Image.Image):
        pil_img = image_input
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    result = classifier.predict_image(pil_img)
    result["status"] = "success"
    return result
