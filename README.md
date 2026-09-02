# Knee-Analyzer-orthinx-
ORTHINX is an AI-powered knee X-ray analysis platform for automated measurements, segmentation, meniscus analysis, implant planning, patient management, and clinical PDF report generation.

✨ Features
🩻 Knee X-ray upload and validation

🤖 AI-based knee segmentation and analysis
📏 Automated anatomical and joint-space measurements
🦴 Femoral and tibial measurements
🔍 Image enhancement and visualization
🧠 Meniscus and knee assessment
📊 Measurement quality and reliability scoring
👤 Patient information and case management
📄 Professional PDF and JSON report generation
🖼️ Uploaded X-ray included in final reports
🕒 Real-time date and time tracking
🔐 Input validation and secure file handling
🔄 Complete frontend–backend integration
🧠 AI Model

The system uses a MONAI 2D U-Net for knee X-ray segmentation.

Validated performance:

Metric	Result
Dice / F1 Score	94.22%
IoU	89.94%
Precision	92.31%
Recall	96.27%
Pixel Accuracy	99.31%
Specificity	99.52%

Validation was performed on an untouched 60-patient test cohort.

🔄 System Workflow
Patient Details
      ↓
X-Ray Upload
      ↓
Image Validation
      ↓
Image Enhancement
      ↓
AI Segmentation
      ↓
Anatomical Measurements
      ↓
Knee Assessment
      ↓
Complete Report
      ↓
PDF / JSON Export
📊 Backend

The backend handles:

Image processing
AI inference
Native-space reconstruction
Anatomical measurements
JSW analysis
Quality control
Research assessment
Report generation
PDF/JSON exports
API communication
Patient and scan management
🖥️ Frontend

The frontend provides an interactive dashboard for:

Uploading X-rays
Entering patient details
Viewing original/enhanced images
Viewing segmentation results
Reviewing measurements
Viewing knee assessment
Generating and downloading reports
🧪 Testing

The final system contains:

122 automated tests — 122 passed (100%)

Testing covers API integration, image processing, segmentation, measurements, assessment, reporting, calibration safety, security, edge cases, and frontend/backend workflow.

⚠️ Research Disclaimer

ORTHINX is a research and clinical decision-support prototype. It is not a clinically validated diagnostic system and should not replace assessment by a qualified healthcare professional. Physical measurements in millimeters are reported only when verified pixel-spacing metadata is available.

🚀 Project Status

Status: PASS WITH OBSERVATIONS — Ready for Academic Demonstration and Final Submission.
