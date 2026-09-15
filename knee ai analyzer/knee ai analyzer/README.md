# KneeAI — AI-Assisted Knee Assessment & Patient-Specific Implant Planning

Backend API and AI pipeline foundation for knee radiograph analysis, anatomical measurement estimation, Osteoarthritis (OA) severity grading, and patient-specific implant matching.

---

## 🏛️ Architecture Overview

The system is organized into a modular backend ready to integrate medical imaging processing and AI inference engines:

```text
knee-ai-analyzer/
│
├── app/
│   ├── api/             # API routes (Patients, Scans, Preprocessing)
│   ├── core/            # Core settings, constants, and paths
│   ├── db/              # SQLAlchemy database engine and session management
│   ├── models/          # Database ORM models (Patient, Scan)
│   ├── schemas/         # Pydantic validation schemas
│   ├── services/        # Business logic & preprocessing pipeline
│   │   └── preprocessing/
│   │       ├── loader.py        # NIfTI, DICOM, and 2D image loaders
│   │       ├── validator.py     # Numeric integrity & array validation
│   │       ├── metadata.py      # Spatial & intensity metadata extractor
│   │       ├── normalization.py # Min-max, z-score, percentile clipping
│   │       ├── resampling.py    # Physical voxel spacing spline interpolation
│   │       ├── orientation.py   # Canonical RAS+ coordinate reorientation
│   │       └── pipeline.py      # End-to-end preprocessing orchestrator
│   ├── utils/           # Helper functions
│   └── main.py          # FastAPI application entrypoint
│
├── data/
│   ├── uploads/         # Ingested raw medical scans (DICOM/NIfTI/PNG)
│   ├── processed/       # Preprocessed images & standardizations
│   └── results/         # Generated segmentation masks & overlays
│
├── model_weights/       # Deep learning model weight artifacts (.pth/.pt/.onnx)
├── tests/               # Unit and integration test suite
├── .env.example         # Template for environment configuration
├── .gitignore           # Git ignore rules
├── requirements.txt     # Python backend dependencies
└── README.md            # Project documentation
```

---

## 🔬 Medical Image Preprocessing

> **Clinical Disclaimer:** *Preprocessing prepares medical images for downstream AI segmentation. It does not perform segmentation or diagnosis.*

### 1. Supported Formats
* **NIfTI Volumes (`.nii`, `.nii.gz`):** 3D/4D volumetric MRI or CT knee acquisitions.
* **DICOM (`.dcm`):** Single-slice and multi-frame medical imaging preserving spatial metadata, pixel spacing, slice thickness, and rescale slope/intercept.
* **2D Radiographs (`.png`, `.jpg`, `.jpeg`):** Standard 2D planar projection exports.

### 2. Loading
Loaded via `nibabel` (NIfTI), `pydicom` (DICOM), and `PIL` (2D images), retaining exact affine coordinate matrices and voxel zoom dimensions without downsampling or destroying 3D spatial context.

### 3. Metadata Extraction
Inspects and exposes:
* Spatial dimensions (`dimensions`, `num_dimensions`)
* Physical voxel spacing in millimeters (`spacing`: `[sx, sy, sz]`)
* Anatomical orientation code (`orientation`: e.g., `RAS`, `LPS`)
* Numerical data type (`dtype`)
* Full intensity distribution (`intensity_min`, `intensity_max`, `intensity_mean`, `intensity_std`)

### 4. Normalization Strategies
Configurable intensity standardizations:
* **`min_max` (default):** Scales intensities linearly to a target range (e.g. $[0.0, 1.0]$).
* **`z_score`:** Centers intensities to zero mean and unit variance.
* **`percentile_clip`:** Robust MRI/CT clipping of outlier tail percentiles (0.5% and 99.5%) prior to scaling.
* **`none`:** Preserves raw voxel values.

### 5. Resampling
Performs spline interpolation to a user-configured physical voxel spacing (e.g. $[1.0, 1.0, 1.0]$ mm). Preserves original native dimensions and voxel spacing if no target is specified.

### 6. Orientation Handling
Automatically standardizes 3D volumetric affine coordinates to canonical **RAS+** (Right, Anterior, Superior) anatomical orientation while preserving exact patient geometry.

### 7. Output Storage
Preprocessed files are saved with collision-safe unique identifiers inside `data/processed/` (`proc_<uuid>.nii.gz` or `proc_<uuid>.png`), completely leaving the original files in `data/uploads/` untouched.

### 8. Preprocessing API Endpoints
* **`GET /scans/{scan_id}/metadata`** — Extract and inspect original scan spatial and intensity metadata.
* **`POST /scans/{scan_id}/preprocess`** — Trigger preprocessing with configurable parameters (`normalization_method`, `target_spacing`, `reorient`).

---

## 🚀 Getting Started

### 1. Prerequisites
* Python 3.10+
* Git

### 2. Environment Setup

Create and activate a virtual environment:

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

---

## 💻 Running the Server

Start the development server with Uvicorn:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

* **Root Status:** `http://localhost:8000/`
* **Health Check:** `http://localhost:8000/health`
* **Interactive Swagger UI:** `http://localhost:8000/docs`
* **Alternative ReDoc UI:** `http://localhost:8000/redoc`

---

## 🧪 Running Tests

Execute the test suite using `pytest`:

```bash
python -m pytest -v
```
