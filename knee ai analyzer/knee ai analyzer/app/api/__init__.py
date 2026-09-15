"""API routers package."""
from app.api.patients import router as patients_router
from app.api.images import router as images_router
from app.api.scans import router as scans_router

__all__ = ["patients_router", "images_router", "scans_router"]
