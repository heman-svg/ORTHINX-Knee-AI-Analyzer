import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  File as FileIcon,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Activity,
  RotateCw,
  ArrowRight,
  User,
  Calendar,
  Layers,
  Zap,
  Info,
} from "lucide-react";
import { useAnalysisStore, AnatomicalOrientation } from "../store/analysisStore";

export const UploadImagePage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] = useState<string>("Preparing radiograph...");

  const {
    activeCaseId,
    orientation,
    views,
    pixelSpacingInput,
    patientInfo,
    setPatientInfo,
    setOrientation,
    setUploadedFile,
    setPixelSpacingInput,
    enhanceImage,
    runAnalysis,
    clearAnalysis,
  } = useAnalysisStore();

  const currentView = views[orientation];
  const hasFile = Boolean(currentView.file || currentView.filePreviewUrl);
  const isAnalyzing = currentView.isAnalyzing;

  const handleFileSelect = (f: File) => {
    const validExts = [".dcm", ".png", ".jpg", ".jpeg"];
    const isImage = f.type.startsWith("image/") || validExts.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!isImage) {
      setErrorMessage("Please select a valid radiograph image (DICOM, PNG, or JPEG format).");
      return;
    }
    setErrorMessage(null);
    setUploadedFile(f, orientation);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRunAnalysis = async () => {
    if (!hasFile || isAnalyzing) return;
    setErrorMessage(null);
    setProcessingPhase("Preparing radiograph...");

    const phaseTimer1 = setTimeout(() => setProcessingPhase("Running AI segmentation model..."), 800);
    const phaseTimer2 = setTimeout(() => setProcessingPhase("Extracting anatomical landmark vectors..."), 1800);
    const phaseTimer3 = setTimeout(() => setProcessingPhase("Calculating joint clearances & measurements..."), 2800);

    try {
      const res = await runAnalysis(orientation);
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
      if (res) {
        navigate("/analysis/results");
      }
    } catch (err: any) {
      clearTimeout(phaseTimer1);
      clearTimeout(phaseTimer2);
      clearTimeout(phaseTimer3);
      setErrorMessage(
        err?.message || "Analysis request failed. Please ensure the ORTHINX backend is running."
      );
    }
  };

  const currentStudyTime = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Page Header */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "18px",
        }}
      >
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: "0 0 4px 0", fontSize: "22px", fontWeight: 700 }}>
            <UploadCloud size={24} style={{ color: "var(--primary)" }} />
            <span>Upload Knee X-Ray</span>
          </h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
            Import AP, Lateral, or Axial radiographs for automated anatomical AI analysis
          </p>
        </div>

        {hasFile && currentView.analysisResult && (
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/analysis/results")}
            style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
          >
            <span>View Current Results</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Two-Column Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Patient/Case Context & Projection Setup */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Patient Context Card */}
          <div className="card" style={{ padding: "20px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, marginBottom: "14px" }}>
              <User size={16} style={{ color: "var(--primary)" }} />
              Patient & Case Context
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Patient ID / MRN
                </label>
                <input
                  type="text"
                  className="input"
                  value={patientInfo.patientId}
                  onChange={(e) => setPatientInfo({ patientId: e.target.value })}
                  placeholder="e.g. PT-49821"
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Patient Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={patientInfo.patientName}
                  onChange={(e) => setPatientInfo({ patientName: e.target.value })}
                  placeholder="e.g. Sarah Johnson"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={patientInfo.patientAge}
                    onChange={(e) => setPatientInfo({ patientAge: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                    Sex
                  </label>
                  <select
                    className="input"
                    value={patientInfo.patientSex}
                    onChange={(e) => setPatientInfo({ patientSex: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid var(--border)", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>Study Date:</span>
                <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{currentStudyTime}</span>
              </div>
            </div>
          </div>

          {/* Radiographic View Selector */}
          <div className="card" style={{ padding: "20px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700, marginBottom: "12px" }}>
              <Layers size={16} style={{ color: "var(--primary)" }} />
              Radiographic Projection
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              {(
                [
                  { id: "front", label: "AP", sub: "Frontal" },
                  { id: "side", label: "Lateral", sub: "Sagittal" },
                  { id: "top", label: "Axial", sub: "Skyline" },
                ] as const
              ).map((v) => {
                const isSelected = orientation === v.id;
                const hasScan = Boolean(views[v.id]?.filePreviewUrl);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setOrientation(v.id as AnatomicalOrientation)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: isSelected ? "var(--primary-subtle)" : "var(--bg-app)",
                      color: isSelected ? "var(--primary)" : "var(--text-main)",
                      cursor: "pointer",
                      textAlign: "center",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: 700 }}>{v.label}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{v.sub}</div>
                    {hasScan && (
                      <span
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#10B981",
                        }}
                        title="Radiograph loaded for this view"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Optional Physical Pixel Spacing */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
                  Pixel Spacing (mm/px)
                </label>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Optional</span>
              </div>
              <input
                type="number"
                step="0.001"
                className="input"
                placeholder="Auto-detected if DICOM"
                value={pixelSpacingInput}
                onChange={(e) => setPixelSpacingInput(e.target.value)}
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px", lineHeight: 1.4 }}>
                Leave empty if uncalibrated. Output will report precise native pixel measurements.
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Radiograph Upload Dropzone & Live Image Stage */}
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Active Radiograph Viewport
              </span>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)", margin: "2px 0 0 0" }}>
                {orientation === "front" ? "Anterior-Posterior (AP) Projection" : orientation === "side" ? "Lateral Sagittal Projection" : "Axial Skyline Projection"}
              </h2>
            </div>

            {hasFile && !isAnalyzing && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => clearAnalysis(orientation)}
                style={{ fontSize: "12px", color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <X size={14} />
                <span>Clear Image</span>
              </button>
            )}
          </div>

          {/* Upload Dropzone / Viewport */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!hasFile && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            style={{
              flex: 1,
              minHeight: "440px",
              borderRadius: "10px",
              border: isDragOver
                ? "2px dashed var(--primary)"
                : hasFile
                ? "1px solid var(--border)"
                : "2px dashed var(--border)",
              background: hasFile ? "#050505" : isDragOver ? "var(--primary-subtle)" : "var(--bg-app)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              cursor: hasFile ? "default" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.dcm"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            {hasFile ? (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                <img
                  src={currentView.enhancedPreviewUrl || currentView.filePreviewUrl || ""}
                  alt="Uploaded Knee Radiograph"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "480px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />

                {currentView.enhancementApplied && (
                  <span
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: "rgba(91, 75, 255, 0.2)",
                      border: "1px solid var(--primary)",
                      color: "#c7d2fe",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Sparkles size={12} />
                    CLAHE Contrast Enhanced
                  </span>
                )}

                {/* Status Overlay when analyzing */}
                {isAnalyzing && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(5, 5, 5, 0.8)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "14px",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <div
                      className="spinner-border"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderColor: "var(--primary)",
                        borderRightColor: "transparent",
                      }}
                    />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                        {processingPhase}
                      </div>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Running UNet++ deep learning pipeline
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Dropzone Placeholder */
              <div style={{ textAlign: "center", padding: "48px 24px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "var(--primary-subtle)",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <UploadCloud size={28} />
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
                  Select or Drag & Drop Knee Radiograph
                </h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "340px", margin: "0 auto 16px" }}>
                  Supports DICOM (.dcm), high-resolution PNG, and JPEG imaging files.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {/* Action Bar Beneath Preview */}
          {hasFile ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "18px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => enhanceImage(orientation)}
                  disabled={currentView.isEnhancing || isAnalyzing}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                  title="Enhance contrast using CLAHE preprocessing"
                >
                  <Sparkles size={14} style={{ color: "var(--primary)" }} />
                  <span>{currentView.isEnhancing ? "Enhancing..." : "Apply Contrast (CLAHE)"}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
                >
                  <RotateCw size={13} />
                  <span>Replace Radiograph</span>
                </button>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                <Zap size={15} />
                <span>{isAnalyzing ? "Processing..." : "Run AI Analysis"}</span>
                {!isAnalyzing && <ArrowRight size={15} />}
              </button>
            </div>
          ) : (
            <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px" }}>
              <Info size={14} />
              <span>No analysis available yet. Upload a radiograph to begin.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};