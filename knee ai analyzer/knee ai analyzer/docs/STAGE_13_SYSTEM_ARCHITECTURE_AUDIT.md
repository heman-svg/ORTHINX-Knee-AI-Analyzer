# STAGE 13 — System Architecture & Component Audit

**Project:** KneeAI Analyzer (AI-Assisted Knee Joint Radiograph Analysis & Research Platform)  
**Date:** 2026-08-23  
**Audit Stage:** Stage 13 — Final End-to-End System Integration & Production Readiness  

---

## 1. High-Level Architecture Overview

The KneeAI Analyzer is built as a decoupled, asynchronous-ready client-server web platform consisting of:
1. **High-Performance FastAPI Backend** (`app/`): RESTful endpoints with OpenAPI 3.0 documentation, SQLAlchemy ORM, and SQLite database persistence.
2. **Medical Deep Learning Core** (`app/services/`): MONAI 2D U-Net engine with aspect-ratio preserving letterbox preprocessing and native-space inverse coordinate mapping.
3. **Native-Space Quantitative Geometry & JSW Profiling** (`app/services/measurements/`): Column-wise joint space clearance profiling, component mass ratio auditing, and physical spacing calibration gating.
4. **Structured Research Assessment & Scoring Engine** (`app/services/assessment/`): Transparent reliability scoring ($0.00$ to $1.00$) and quality control flags.
5. **Multi-Section Export & Reporting Engine** (`app/services/reporting/`): ReportLab PDF generator and JSON serialization pipeline.
6. **Modern Dark-Mode Frontend** (`static/`): Vanilla HTML5/CSS3/JavaScript single-page application (SPA) with responsive viewers (single overlay, split dual-viewport, 4-panel diagnostic visual card).

```
+-----------------------------------------------------------------------------------+
|                                 WEB FRONTEND                                      |
|    HTML5 / CSS3 / Vanilla JavaScript SPA (static/index.html, app.js, style.css)   |
|   - Multi-View Modes: Overlay | Side-by-Side | Raw | Mask | Assessment | Report   |
|   - Actions: 1. Preprocess -> 2. Segment -> 3. Measurements -> 4. Assessment      |
|              -> 5. Complete Report -> Export PDF & Export JSON                    |
+------------------------------------------+----------------------------------------+
                                           | HTTP / JSON / Multipart
                                           v
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND                                    |
|                       (app/main.py, app/api/*.py)                                 |
|   - /patients/      : Patient CRUD, upload scans, load test samples               |
|   - /scans/         : Preprocess, Segment, Measurements, Assessment, Report, PDF  |
+------------------------------------------+----------------------------------------+
                                           |
    +--------------------------------------+------------------------------------+
    |                                      |                                    |
    v                                      v                                    v
+------------------------+  +-------------------------------+  +--------------------+
| PREPROCESSING & LOADER |  |      AI SEGMENTATION CORE     |  |    DATABASE (ORM)  |
| (app/services/         |  |   (app/services/segmentation) |  | (app/db/, SQLite)  |
|  preprocessing/)       |  |   - MONAI 2D U-Net            |  | - Patient, Scan    |
| - SimpleITK, Nibabel,  |  |   - best_model_v2.pth (CPU)   |  | - Metadata, State  |
|   Pillow, PyDicom      |  |   - 512x512 Letterbox Tensor  |  | - Relationships    |
| - Aspect-Ratio Scaling |  |   - Unletterbox to Native     |  +--------------------+
+------------------------+  +---------------+---------------+
                                            | Native-Space Mask
                                            v
                            +-------------------------------+
                            |   MEASUREMENTS & JSW PROFILE  |
                            |   (app/services/measurements) |
                            |   - Bounding Box & Centroids  |
                            |   - Column JSW Clearance      |
                            |   - Quality Control Auditing  |
                            |   - Calibration Spacing Gating|
                            +---------------+---------------+
                                            | Metrics & Geometry
                                            v
                            +-------------------------------+
                            |   RESEARCH ASSESSMENT ENGINE  |
                            |   (app/services/assessment/)  |
                            |   - Reliability Score (0-1)   |
                            |   - Non-Diagnostic Notes      |
                            |   - 4-Panel Visual Card       |
                            +---------------+---------------+
                                            |
                                            v
                            +-------------------------------+
                            |    REPORTING & PDF / JSON     |
                            |    (app/services/reporting/)  |
                            |   - KneeAnalysisReport Schema |
                            |   - ReportLab PDF Compiler    |
                            |   - JSON Export Engine        |
                            +-------------------------------+
```

---

## 2. Directory Tree & Module Inventory

```
knee ai analyzer/
├── app/
│   ├── api/
│   │   ├── images.py                   # Direct image upload and retrieval
│   │   ├── patients.py                 # Patient management and test sample loader
│   │   └── scans.py                    # Preprocessing, Segmentation, Measurements, Assessment, Report
│   ├── core/
│   │   └── config.py                   # App settings, directory initialization, device configuration
│   ├── db/
│   │   ├── base.py                     # SQLAlchemy metadata imports
│   │   ├── database.py                 # SQLite sessionmaker and engine
│   │   └── init_db.py                  # Schema generation
│   ├── models/
│   │   ├── patient.py                  # Patient ORM model
│   │   └── scan.py                     # Scan ORM model (paths, statuses, timestamps)
│   ├── schemas/
│   │   ├── patient.py                  # Patient Pydantic request/response models
│   │   └── scan.py                     # Scan metadata, segmentation, and measurement responses
│   ├── services/
│   │   ├── assessment/                 # Stage 11 Structured Research Assessment Engine
│   │   │   ├── config.py
│   │   │   ├── engine.py               # Reliability scoring and evaluation logic
│   │   │   ├── pipeline.py             # Assessment orchestrator
│   │   │   ├── schemas.py              # Pydantic structured schemas
│   │   │   └── visualization.py        # 4-panel diagnostic visual card renderer
│   │   ├── measurements/               # Stage 9 & 10 Native Measurements & JSW Profiling
│   │   │   ├── calibration.py          # Strict pixel-spacing validation & mm conversion
│   │   │   ├── config.py
│   │   │   ├── geometry.py             # Connected components, bounding box, centroid
│   │   │   ├── jsw.py                  # Column-wise joint space width clearance extraction
│   │   │   ├── pipeline.py             # Native measurement orchestrator
│   │   │   ├── quality.py              # VALID, VALID_WITH_WARNING, INVALID classifier
│   │   │   └── visualization.py        # Native annotation renderer
│   │   ├── preprocessing/              # Medical image loader, normalizer & letterboxer
│   │   │   ├── loader.py               # PNG / DICOM / NIfTI loader
│   │   │   ├── metadata.py             # Spacing, dimensions, format extractor
│   │   │   ├── normalizer.py           # Percentile & min-max intensity scalers
│   │   │   ├── pipeline.py             # Preprocessing orchestrator
│   │   │   └── validator.py            # NaN/Inf/flat image sanity checker
│   │   ├── reporting/                  # Stage 12 End-to-End Reports & PDF/JSON Export
│   │   │   ├── knee_report.py          # Unified report orchestrator
│   │   │   ├── pdf_report.py           # ReportLab PDF compiler
│   │   │   └── schemas.py              # KneeAnalysisReport schema
│   │   ├── segmentation/               # MONAI 2D U-Net Model & Inference
│   │   │   ├── config.py
│   │   │   ├── inference.py            # Singleton model runner & overlay generator
│   │   │   ├── model.py                # PyTorch / MONAI architecture wrapper
│   │   │   └── postprocessing.py       # Argmax and component filters
│   │   ├── training/                   # Stage 8C Aspect-Ratio Retraining & Dataset
│   │   │   └── monai_dataset.py        # Letterbox and unletterbox transforms
│   │   ├── patient_service.py
│   │   └── scan_service.py
│   └── main.py                         # FastAPI application entrypoint
├── data/
│   ├── splits/                         # Deterministic 280/60/60 patient splits (train, val, test)
│   ├── validation_results/             # Evaluation metrics across stages 8–12
│   └── uploads/                        # Uploaded patient radiographs
├── docs/                               # Engineering reports for Stages 8A–13
├── model_weights/
│   └── best_model_v2.pth               # Checkpoint (Val Dice: 0.9311, Test Dice: 0.9422)
├── scripts/                            # Validation and audit runners
├── static/                             # Frontend assets (index.html, app.js, style.css)
├── tests/                              # Pytest test suite (113+ tests across all modules)
└── requirements.txt
```

---

## 3. Technology Stack & Key Dependencies

* **Web Framework:** FastAPI `0.110+`, Uvicorn `0.28+`, Starlette
* **Deep Learning:** PyTorch `2.0+`, MONAI `1.3+`
* **Medical Image Processing:** SimpleITK `2.3+`, Nibabel `5.2+`, PyDICOM `2.4+`, Pillow `10.0+`
* **Scientific Computing:** NumPy `1.26+`, SciPy `1.12+`, Pandas `2.0+`
* **PDF Compilation:** ReportLab `5.0+`
* **Testing & Validation:** PyTest `9.1+`, HTTPX `0.27+`
* **Database:** SQLite 3 with SQLAlchemy `2.0+` ORM
