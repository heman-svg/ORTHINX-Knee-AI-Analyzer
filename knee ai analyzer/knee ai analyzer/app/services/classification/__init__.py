"""
KneeAI Severity Classification Service
5-Class Classifier: 0Normal, 1Doubtful, 2Mild, 3Moderate, 4Severe
"""
from app.services.classification.model import KneeSeverityClassifier
from app.services.classification.inference import (
    predict_knee_severity,
    get_default_classifier,
)

__all__ = [
    "KneeSeverityClassifier",
    "predict_knee_severity",
    "get_default_classifier",
]
