from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator, Dict
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.patients import router as patients_router
from app.api.images import router as images_router
from app.api.scans import router as scans_router
from app.core.config import settings
from app.db.base import Base
from app.db.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle events."""
    # Ensure storage directories exist
    settings.init_directories()
    Path("data/audit_visualizations").mkdir(parents=True, exist_ok=True)
    Path("static").mkdir(parents=True, exist_ok=True)
    # Initialize database tables automatically for development
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API and AI Pipeline for AI-Assisted Knee Assessment & Patient-Specific Implant Planning",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(patients_router)
app.include_router(images_router)
app.include_router(scans_router)

# Mount Static File Endpoints
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/results", StaticFiles(directory=settings.RESULTS_DIR), name="results")
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/preprocessed", StaticFiles(directory=settings.PROCESSED_DIR), name="preprocessed")
if Path("data/audit_visualizations").exists():
    app.mount("/audit_vis", StaticFiles(directory="data/audit_visualizations"), name="audit_vis")


@app.get("/", tags=["Root"])
def read_root() -> Dict[str, str]:
    """Root endpoint returning basic service status."""
    return {
        "message": "KneeAI Backend Running",
        "status": "healthy",
    }


@app.get("/health", tags=["Health"])
def check_health() -> Dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "KneeAI Backend",
    }


@app.get("/dashboard", tags=["UI"])
@app.get("/app", tags=["UI"])
def serve_dashboard():
    """Serve the KneeAI interactive medical assessment and analysis dashboard."""
    index_file = Path("static/index.html")
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "message": "KneeAI Backend Running",
        "status": "healthy",
    }
