# ORTHINX — AI-Powered Knee X-Ray Analysis

ORTHINX is an AI-powered knee X-ray analysis platform for automated measurements, segmentation, meniscus analysis, implant planning, patient management, and clinical PDF report generation.

## ✨ Features

- 🩻 Knee X-ray upload and validation
- 🤖 AI-based knee segmentation and analysis
- 📏 Automated anatomical and joint-space measurements
- 🦴 Femoral and tibial measurements
- 🔍 Image enhancement and visualization
- 🧠 Meniscus and knee assessment
- 📊 Measurement quality and reliability scoring
- 👤 Patient information and case management
- 📄 Professional PDF and JSON report generation
- 🖼️ Uploaded X-ray included in final reports
- 🕒 Real-time date and time tracking
- 🔐 Input validation and secure file handling
- 🔄 Complete frontend-backend integration

## 🤖 AI Model

The system uses a **MONAI 2D U-Net** for knee X-ray segmentation.

## 📊 Validated Performance

Validation was performed on an **untouched 60-patient test cohort**.

| Metric | Result |
|---|---:|
| Dice / F1 Score | **94.22%** |
| IoU | **89.94%** |
| Precision | **92.31%** |
| Recall | **96.27%** |
| Pixel Accuracy | **99.31%** |
| Specificity | **99.52%** |

> Dice/F1 and IoU are the primary segmentation performance metrics.

## 🔄 System Workflow

**Patient Details**  
↓  
**X-Ray Upload**  
↓  
**Image Validation**  
↓  
**Image Enhancement**  
↓  
**AI Segmentation**  
↓  
**Anatomical Measurements**  
↓  
**Knee Assessment**  
↓  
**Complete Report**  
↓  
**PDF / JSON Export**

## ⚙️ Backend

The backend handles:

- Image processing
- AI inference
- Native-space reconstruction
- Anatomical measurements
- JSW analysis
- Quality control
- Research assessment
- Report generation
- PDF and JSON export

## 🛠️ Technology Stack

- **AI / Deep Learning:** MONAI, PyTorch
- **Segmentation:** 2D U-Net
- **Image Processing:** OpenCV
- **Backend:** Flask / FastAPI
- **Frontend:** React
- **Database:** PostgreSQL
- **Task Processing:** Celery
- **Cache / Queue:** Redis
- **Deployment:** Docker

## 🧪 Testing

The complete application workflow has been tested across:

- Image upload and validation
- Preprocessing
- AI segmentation
- Anatomical measurements
- Knee assessment
- Report generation
- PDF / JSON export
- Frontend-backend integration
- API communication
- Security and edge cases

## ⚠️ Disclaimer

ORTHINX is a **research and clinical decision-support system** and is not a replacement for professional medical diagnosis.

Physical measurements in millimeters require valid image calibration or DICOM pixel-spacing information. Where calibration is unavailable, measurements are reported in pixels.

## 📌 Project Status

**Research prototype — AI pipeline and application workflow implemented and validated for academic demonstration.**
