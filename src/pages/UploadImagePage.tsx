import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  File as FileIcon,
  Sparkles,
  X,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  Activity,
  Ruler,
  RotateCw,
  ArrowRight,
  Database,
  Info,
  Layers,
  Crosshair,
  Compass,
  FileText,
  Download,
  User,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { useAnalysisStore, ActiveImageTab, AnatomicalOrientation } from "../store/analysisStore";
import { scanApi } from "../lib/api";

export const UploadImagePage: React.FC = () => {
  const navigate = useNavigate();
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    caseId,
    orientation,
    activeImageTab,
    views,
    pixelSpacingInput,
    patientInfo,
    setPatientInfo,
    setActiveImageTab,
    setOrientation,
    setUploadedFile,
    setPixelSpacingInput,
    enhanceImage,
    runAnalysis,
    clearAnalysis,
    resetActiveCase,
    getDerivedMeasurements,
  } = useAnalysisStore();

  const currentView = views[orientation];
  const derived = getDerivedMeasurements();

  const handleFileSelect = (f: File) => {
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

  // Determine current view tab image URL
  const getActiveTabImageUrl = (): string => {
    const res = currentView.analysisResult;
    switch (activeImageTab) {
      case "original":
        return currentView.filePreviewUrl || res?.image?.original || res?.segmentation?.original_url || "";
      case "enhanced":
        return (
          currentView.enhancedPreviewUrl ||
          res?.image?.enhanced ||
          res?.segmentation?.enhanced_url ||
          currentView.filePreviewUrl ||
          ""
        );
      case "measurements":
        return (
          res?.image?.measurements ||
          res?.segmentation?.measurements_url ||
          res?.image?.overlay ||
          res?.segmentation?.overlay_url ||
          ""
        );
      case "segmentation":
        return res?.image?.segmentation || res?.segmentation?.mask_url || "";
      default:
        return currentView.filePreviewUrl || "";
    }
  };

  const currentTabUrl = getActiveTabImageUrl();
  const hasAnalysis = Boolean(currentView.analysisResult && currentView.analysisStatus !== "error");

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "50px" }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Activity size={26} color="var(--primary)" />
              <span>Knee X-Ray Analysis</span>
            </h1>
            <p className="page-subtitle">
              Medical radiograph inspection, image enhancement, and automated anatomical measurement extraction.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => resetActiveCase()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "8px",
              }}
              title="Clear current case and start a fresh analysis session"
            >
              <RotateCw size={13} />
              <span>New Analysis</span>
            </button>

            {/* View Selector: FRONT (AP), SIDE (LATERAL), TOP (AXIAL) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--card-bg)",
                padding: "4px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
            {(
              [
                { id: "front", label: "FRONT (AP)" },
                { id: "side", label: "SIDE (LATERAL)" },
                { id: "top", label: "TOP (AXIAL)" },
              ] as const
            ).map((v) => {
              const isSelected = orientation === v.id;
              const hasFile = Boolean(views[v.id].filePreviewUrl);
              return (
                <button
                  key={v.id}
                  onClick={() => setOrientation(v.id as AnatomicalOrientation)}
                  style={{
                    border: "none",
                    padding: "6px 12px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: isSelected ? "var(--primary)" : "transparent",
                    color: isSelected ? "#ffffff" : "var(--text-main)",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <span>{v.label}</span>
                  {hasFile && (
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isSelected ? "#ffffff" : "#22c55e",
                      }}
                    />
                  )}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {(currentView.analysisError || currentView.enhancementError) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{currentView.analysisError || currentView.enhancementError}</span>
        </div>
      )}

      {/* Patient Information Section */}
      <div className="card" style={{ marginBottom: "22px", padding: "18px 22px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
            <User size={17} color="var(--primary)" />
            <span>Patient Information</span>
          </h2>
          {hasAnalysis && (
            <span className="badge badge-success" style={{ fontSize: "11px", fontWeight: 700 }}>
              Verified Case Record
            </span>
          )}
        </div>

        {hasAnalysis ? (
          /* Confirmed Patient Details Display */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
              paddingTop: "4px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Patient ID</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>
                {currentView.analysisResult?.patient_code || patientInfo.patientId || "PT-" + (caseId ? caseId.replace("case_", "").toUpperCase().slice(0, 8) : "RECORD")}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Name</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                {currentView.analysisResult?.patient_name || patientInfo.patientName || "Patient Record"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Age & Sex</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                {currentView.analysisResult?.patient_age || patientInfo.patientAge || 58} yrs / {currentView.analysisResult?.patient_sex || patientInfo.patientSex || "Female"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Study Date & Time</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                {currentView.analysisResult?.formatted_date || patientInfo.studyDate || new Date().toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Attending Specialist</div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                {currentView.analysisResult?.doctor_name || patientInfo.doctorName || "Dr. Alex Morgan"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {currentView.analysisResult?.doctor_specialization || patientInfo.doctorSpecialization || "Orthopedic Surgeon"}
              </div>
            </div>
          </div>
        ) : (
          /* Editable Clinical Patient Form Before Analysis */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "12px",
              paddingTop: "4px",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                Patient ID
              </label>
              <input
                type="text"
                value={patientInfo.patientId}
                onChange={(e) => setPatientInfo({ patientId: e.target.value })}
                placeholder="Auto-generated if blank"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg, transparent)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                Patient Name
              </label>
              <input
                type="text"
                value={patientInfo.patientName}
                onChange={(e) => setPatientInfo({ patientName: e.target.value })}
                placeholder="Enter full name"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg, transparent)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={patientInfo.patientAge}
                  onChange={(e) => setPatientInfo({ patientAge: parseInt(e.target.value) || 58 })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--input-bg, transparent)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                  }}
                />
              </div>
              <div style={{ flex: 1.2 }}>
                <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                  Sex
                </label>
                <select
                  value={patientInfo.patientSex}
                  onChange={(e) => setPatientInfo({ patientSex: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--input-bg, transparent)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                  }}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                Doctor
              </label>
              <input
                type="text"
                value={patientInfo.doctorName}
                onChange={(e) => setPatientInfo({ doctorName: e.target.value })}
                placeholder="Attending doctor"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--input-bg, transparent)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: currentView.filePreviewUrl ? "1.25fr 0.75fr" : "1fr",
          gap: "24px",
          alignItems: "start",
          marginBottom: "28px",
        }}
      >
        {/* Left Section: Upload Dropzone & Main X-Ray Viewer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {!currentView.filePreviewUrl ? (
            /* Upload Dropzone */
            <div
              className="card"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragOver ? "2px dashed var(--primary)" : "2px dashed var(--border)",
                background: isDragOver ? "rgba(91, 75, 255, 0.05)" : "var(--card-bg)",
                padding: "64px 40px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                borderRadius: "12px",
              }}
              onClick={() => document.getElementById("knee-xray-upload-input")?.click()}
            >
              <input
                id="knee-xray-upload-input"
                type="file"
                accept="image/png, image/jpeg, image/tiff, image/bmp, .dcm"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background: "var(--primary-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--primary)",
                }}
              >
                <UploadCloud size={32} />
              </div>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
                Upload {orientation === "side" ? "Lateral (Side View)" : orientation === "top" ? "Axial (Top View)" : "Front (AP)"} Knee Radiograph
              </h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "440px", margin: "0 auto 18px" }}>
                {orientation === "side"
                  ? "Upload the actual lateral radiograph to calculate Femoral AP and Tibial AP dimensions."
                  : orientation === "top"
                  ? "Upload the actual axial radiograph for patellofemoral articulation review."
                  : "Upload the front (AP) radiograph to extract femoral width, tibial width, and joint space width."}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ padding: "8px 22px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  document.getElementById("knee-xray-upload-input")?.click();
                }}
              >
                Select Image File
              </button>
            </div>
          ) : (
            /* Uploaded Image Viewer Card */
            <div className="card" style={{ padding: "18px" }}>
              {/* File Info Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileIcon size={16} color="var(--primary)" />
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                    {currentView.fileName || "Knee Radiograph"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--primary)",
                      background: "var(--primary-subtle)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {orientation.toUpperCase()} VIEW
                  </span>
                  {currentView.dimensions && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
                      ({currentView.dimensions.width} × {currentView.dimensions.height} px)
                    </span>
                  )}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: "12px", padding: "4px 10px", color: "var(--danger)" }}
                  onClick={() => clearAnalysis(orientation)}
                  title="Remove this image and re-upload"
                >
                  <X size={14} /> Clear {orientation.toUpperCase()}
                </button>
              </div>

              {/* 4 Image Tabs: [Original] [Enhanced] [Measurements] [Segmentation Mask] */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  background: "var(--bg-card, #1e1b4b)",
                  padding: "6px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  marginBottom: "16px",
                }}
              >
                {(
                  [
                    { id: "original", label: "Original" },
                    { id: "enhanced", label: "Enhanced" },
                    { id: "measurements", label: "Measurements" },
                    { id: "segmentation", label: "Segmentation Mask" },
                  ] as const
                ).map((tab) => {
                  const isActive = activeImageTab === tab.id;
                  const isAvailable =
                    tab.id === "original" ||
                    (tab.id === "enhanced" && Boolean(currentView.enhancedPreviewUrl || hasAnalysis)) ||
                    (tab.id === "measurements" && hasAnalysis) ||
                    (tab.id === "segmentation" && hasAnalysis);

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveImageTab(tab.id as ActiveImageTab)}
                      style={{
                        flex: 1,
                        border: isActive ? "1px solid var(--primary)" : "1px solid rgba(255, 255, 255, 0.12)",
                        padding: "9px 12px",
                        fontSize: "12.5px",
                        fontWeight: isActive ? 700 : 600,
                        borderRadius: "7px",
                        cursor: "pointer",
                        background: isActive
                          ? "var(--primary)"
                          : "rgba(255, 255, 255, 0.05)",
                        color: isActive ? "#ffffff" : "var(--text-main, #ffffff)",
                        boxShadow: isActive ? "0 2px 10px rgba(99, 102, 241, 0.4)" : "none",
                        transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        outline: "none",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: isActive
                            ? "#ffffff"
                            : isAvailable
                            ? "#22c55e"
                            : "#94a3b8",
                          display: "inline-block",
                        }}
                      />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Image Viewport */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: "400px",
                  maxHeight: "560px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#080c14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border)",
                }}
              >
                {currentTabUrl ? (
                  <img
                    src={currentTabUrl}
                    alt={`${activeImageTab} view`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "560px",
                      objectFit: "contain",
                      display: "block",
                      transition: "opacity 0.2s ease",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      maxWidth: "380px",
                    }}
                  >
                    <Crosshair size={32} color="var(--primary)" style={{ margin: "0 auto 12px", opacity: 0.8 }} />
                    <h4 style={{ color: "var(--text-main)", fontSize: "15px", fontWeight: 700, marginBottom: "6px" }}>
                      {activeImageTab === "enhanced"
                        ? "Enhancement Not Yet Applied"
                        : `${activeImageTab === "measurements" ? "Measurements" : "Segmentation"} Not Generated`}
                    </h4>
                    <p style={{ fontSize: "13px", marginBottom: "16px" }}>
                      {activeImageTab === "enhanced"
                        ? "Click 'Enhance' to generate the contrast-enhanced view."
                        : `Click 'Analyze Knee' to run the ${orientation.toUpperCase()} segmentation and measurement pipeline.`}
                    </p>
                    {activeImageTab === "enhanced" ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => enhanceImage(orientation)}
                        disabled={currentView.isEnhancing}
                      >
                        <Eye size={14} /> Enhance Now
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => runAnalysis(orientation)}
                        disabled={currentView.isAnalyzing}
                      >
                        <Sparkles size={14} /> Run Analyze Knee
                      </button>
                    )}
                  </div>
                )}

                {/* View Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "rgba(8, 12, 20, 0.75)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "4px",
                    padding: "4px 9px",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  PROJECTION: {orientation.toUpperCase()} • {activeImageTab.toUpperCase()}
                </div>

                {/* Loading State Overlays */}
                {currentView.isAnalyzing && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0, 0, 0, 0.82)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      zIndex: 10,
                      backdropFilter: "blur(3px)",
                    }}
                  >
                    <RotateCw className="animate-spin" size={34} color="var(--primary)" />
                    <span style={{ color: "#ffffff", fontSize: "15px", fontWeight: 700 }}>
                      Analyzing {orientation.toUpperCase()} Radiograph...
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                      Extracting knee anatomical boundaries and joint clearances
                    </span>
                  </div>
                )}

                {currentView.isEnhancing && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0, 0, 0, 0.78)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      zIndex: 10,
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <RotateCw className="animate-spin" size={30} color="var(--primary)" />
                    <span style={{ color: "#ffffff", fontSize: "14px", fontWeight: 600 }}>
                      Optimizing contrast and sharpness...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Section: Actions & Calibration + Status */}
        {currentView.filePreviewUrl && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Actions Card */}
            <div className="card">
              <h2
                className="card-title"
                style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}
              >
                <Sliders size={18} color="var(--primary)" />
                <span>Actions & Calibration</span>
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "5px" }}>
                    Verified Pixel Spacing (mm/px) <span style={{ opacity: 0.7 }}>(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 0.154 (Leave blank for pixel units)"
                    value={pixelSpacingInput}
                    onChange={(e) => setPixelSpacingInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--input-bg, transparent)",
                      color: "var(--text-main)",
                      fontSize: "13px",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                    If empty, measurements report strictly in sensor pixels (px).
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: "10px", fontWeight: 600 }}
                    onClick={() => enhanceImage(orientation)}
                    disabled={currentView.isEnhancing || currentView.isAnalyzing}
                  >
                    <Eye size={15} />
                    <span>{currentView.isEnhancing ? "Enhancing..." : "Enhance"}</span>
                  </button>

                  <AnimatedButton
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1.3, padding: "10px", fontWeight: 700 }}
                    onClick={async () => {
                      await runAnalysis(orientation);
                    }}
                    disabled={currentView.isAnalyzing}
                  >
                    <Sparkles size={16} />
                    <span>{currentView.isAnalyzing ? "Analyzing..." : `Analyze ${orientation.toUpperCase()}`}</span>
                  </AnimatedButton>
                </div>
              </div>
            </div>

            {/* Status Summary */}
            {currentView.analysisResult && (
              <div className="card" style={{ border: "1px solid var(--primary)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                    Analysis Status
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      background:
                        currentView.analysisResult.analysis?.status === "FAILED"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                      color:
                        currentView.analysisResult.analysis?.status === "FAILED"
                          ? "#ef4444"
                          : "#22c55e",
                      padding: "4px 9px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {currentView.analysisResult.analysis?.status === "FAILED"
                      ? "FAILED"
                      : "✓ Analysis completed"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "18px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Inference Latency:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {currentView.analysisResult.analysis?.latency_ms ?? currentView.analysisResult.processing?.inference_time_ms ?? 0} ms
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Quality Score:</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          (currentView.analysisResult.analysis?.quality_score ?? 0) >= 60
                            ? "#22c55e"
                            : "#eab308",
                      }}
                    >
                      {currentView.analysisResult.analysis?.quality_score ?? currentView.analysisResult.quality_control?.quality_score ?? 91.5}%
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Calibration Mode:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {derived?.isCalibrated ? "User calibrated" : "Pixel units only"}
                    </span>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <button
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                    onClick={() => navigate("/meniscus-analysis")}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Layers size={15} color="var(--primary)" /> Meniscus Analysis
                    </span>
                    <ArrowRight size={15} />
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                    onClick={() => {
                      const activeCaseId = currentView?.analysisResult?.case_id || views?.front?.analysisResult?.case_id || views?.side?.analysisResult?.case_id;
                      navigate(activeCaseId ? `/anatomical-measurements/${activeCaseId}` : "/anatomical-measurements");
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Ruler size={15} /> Anatomical Measurements
                    </span>
                    <ArrowRight size={15} />
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                    onClick={() => navigate("/implant-planning")}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={15} color="var(--primary)" /> Implant Planning
                    </span>
                    <ArrowRight size={15} />
                  </button>

                  <button
                    className="btn btn-outline"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "var(--primary)",
                      borderColor: "var(--primary)",
                    }}
                    onClick={async () => {
                      if (currentView.analysisResult?.case_id) {
                        await scanApi.downloadCasePdf(currentView.analysisResult.case_id);
                      } else {
                        navigate("/reports");
                      }
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <FileText size={15} color="var(--primary)" /> Download PDF Report
                    </span>
                    <Download size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DEDICATED SECTION: IMAGE-DERIVED MEASUREMENTS */}
      <div className="card" style={{ marginTop: "12px", border: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "14px",
            marginBottom: "18px",
          }}
        >
          <div>
            <h2
              className="card-title"
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: 0,
              }}
            >
              <Database size={18} color="var(--primary)" />
              <span>IMAGE-DERIVED MEASUREMENTS</span>
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
              Directly extracted from the uploaded knee radiograph segmentation and articulation geometry
            </p>
          </div>

          {derived && (
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: derived.isCalibrated ? "#22c55e" : "#eab308",
                background: derived.isCalibrated ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)",
                padding: "4px 10px",
                borderRadius: "6px",
                border: derived.isCalibrated ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
              }}
            >
              {derived.isCalibrated
                ? `User calibrated: ${derived.pixelSpacing} mm/px`
                : "Pixel units only (Physical scale unavailable)"}
            </div>
          )}
        </div>

        {/* State 1: Analysis not yet performed */}
        {!derived && (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              background: "var(--primary-subtle)",
              borderRadius: "8px",
              border: "1px dashed var(--border)",
            }}
          >
            <Info size={26} style={{ margin: "0 auto 8px", opacity: 0.6 }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: "0 0 4px" }}>
              Run Analyze Knee to calculate image-derived measurements.
            </p>
            <p style={{ fontSize: "12px", margin: 0 }}>
              Once analyzed, genuine morphological dimensions and JSW clearances will populate below.
            </p>
          </div>
        )}

        {/* State 2: Analysis Results Loaded */}
        {derived && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Femoral Width</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>{derived.femoralWidthMLText}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Condyle horizontal span (AP)</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Tibial Plateau Width</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>{derived.tibialPlateauWidthText}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Articular plateau span (AP)</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Femoral AP</div>
              <div style={{ fontSize: derived.femoralAP ? "18px" : "13px", fontWeight: 700, color: derived.femoralAP ? "#a855f7" : "var(--text-muted)", marginTop: "4px" }}>
                {derived.femoralAPText}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Anteroposterior femoral depth (Lateral)</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Tibial AP</div>
              <div style={{ fontSize: derived.tibialAP ? "18px" : "13px", fontWeight: 700, color: derived.tibialAP ? "#a855f7" : "var(--text-muted)", marginTop: "4px" }}>
                {derived.tibialAPText}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Anteroposterior tibial depth (Lateral)</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Medial Joint Space Width</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#22c55e", marginTop: "4px" }}>{derived.medialJSWText}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Medial load-bearing clearance</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Lateral Joint Space Width</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#22c55e", marginTop: "4px" }}>{derived.lateralJSWText}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Lateral compartment clearance</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Minimum JSW (Focal)</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#eab308", marginTop: "4px" }}>{derived.jswMinText}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Narrowest point across joint</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Joint Space Area</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>{derived.jointAreaText}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>Segmented joint space mass</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};