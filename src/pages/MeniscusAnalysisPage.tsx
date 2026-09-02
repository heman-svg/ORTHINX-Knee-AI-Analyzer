import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  ArrowLeft,
  ArrowRight,
  Info,
  ZoomIn,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useAnalysisStore } from "../store/analysisStore";

export const MeniscusAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<"A" | "M" | "P">("A");
  const [viewMode, setViewMode] = useState<"measurements" | "mask" | "original">("measurements");
  const [zoomModalImage, setZoomModalImage] = useState<string | null>(null);

  const {
    actualFile,
    activeCase,
    filePreviewUrl,
    uploadedFileName,
    imageDimensions,
    analysisResult,
    caseId,
    getDerivedMeasurements,
    getZoneMeasurements,
  } = useAnalysisStore();

  const derived = getDerivedMeasurements();
  const zones = getZoneMeasurements();
  const activeZoneData = zones[selectedZone];

  const isCalibrated = Boolean(derived?.isCalibrated);
  const unit = derived?.unit || "px";

  // Determine current display image URL from backend results or preview
  const getDisplayImageUrl = () => {
    if (!analysisResult) return filePreviewUrl || "";
    if (viewMode === "mask") {
      return analysisResult.image?.segmentation || analysisResult.segmentation?.mask_url || filePreviewUrl || "";
    }
    if (viewMode === "original") {
      return analysisResult.image?.original || analysisResult.segmentation?.original_url || filePreviewUrl || "";
    }
    return (
      analysisResult.image?.measurements ||
      analysisResult.segmentation?.measurements_url ||
      analysisResult.image?.overlay ||
      analysisResult.segmentation?.overlay_url ||
      filePreviewUrl ||
      ""
    );
  };

  // If no active analysis case exists
  if (!activeCase || !analysisResult) {
    return (
      <div style={{ maxWidth: "1000px", margin: "40px auto", textAlign: "center" }}>
        <div className="card" style={{ padding: "60px 40px" }}>
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
            <Layers size={32} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            No active analysis
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto 20px" }}>
            Upload and analyze a knee X-ray first.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: "10px 24px" }}
            onClick={() => navigate("/knee-analysis")}
          >
            <UploadCloud size={16} /> Go to Knee Analysis Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Workflow Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => navigate("/knee-analysis")}
          >
            <ArrowLeft size={14} /> Back to Knee Analysis
          </button>

          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>|</span>

          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            Active Case: {uploadedFileName || "Uploaded Knee Radiograph"}
          </span>
          {imageDimensions && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              ({imageDimensions.width} × {imageDimensions.height} px)
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-primary btn-sm"
            style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => {
              const targetCaseId = analysisResult?.case_id || caseId;
              navigate(targetCaseId ? `/anatomical-measurements/${targetCaseId}` : "/anatomical-measurements");
            }}
          >
            <span>Anatomical Measurements</span>
            <ArrowRight size={14} />
          </button>

          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}
            onClick={() => navigate("/implant-planning")}
          >
            <span>Implant Planning</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Page Title Header */}
      <div className="page-header" style={{ marginBottom: "18px" }}>
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Layers size={24} color="var(--primary)" />
          <span>Meniscus & Joint Space Clearance</span>
        </h1>
        <p className="page-subtitle">
          Anatomical compartment clearance evaluation and radiographic joint space analysis.
        </p>
      </div>

      {/* Requirement 4 & 7: Plain Radiograph Explanation Alert */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          background: "rgba(91, 75, 255, 0.08)",
          border: "1px solid rgba(91, 75, 255, 0.25)",
          color: "var(--text-main)",
          padding: "14px 18px",
          borderRadius: "8px",
          marginBottom: "22px",
          fontSize: "13px",
          lineHeight: "1.5",
        }}
      >
        <Info size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong style={{ color: "var(--primary)" }}>Plain 2D X-Ray Articulation Notice: </strong>
          <span>
            Meniscus measurement unavailable for this image/model — plain radiograph evaluates radiolucent joint clearance.
            The fibrocartilaginous meniscus tissue itself is radiolucent on standard X-ray; bone margins and joint space width (JSW) clearances are derived and displayed below.
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Image Viewer */}
        <div className="card" style={{ padding: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
              Radiograph & Clearance Visualizer
            </span>

            {/* View Mode Switcher */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: "var(--bg-dark-mri, #080c14)",
                padding: "3px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
              }}
            >
              {(
                [
                  { id: "measurements", label: "Measurements" },
                  { id: "mask", label: "Joint Mask" },
                  { id: "original", label: "Original" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  style={{
                    border: "none",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: viewMode === mode.id ? 700 : 500,
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: viewMode === mode.id ? "var(--primary)" : "transparent",
                    color: viewMode === mode.id ? "#ffffff" : "var(--text-muted)",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Viewport Box */}
          <div
            style={{
              position: "relative",
              width: "100%",
              minHeight: "380px",
              maxHeight: "500px",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#080c14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--border)",
              cursor: "zoom-in",
            }}
            onClick={() => setZoomModalImage(getDisplayImageUrl())}
            title="Click to zoom image"
          >
            <img
              src={getDisplayImageUrl()}
              alt="Meniscus Analysis"
              style={{
                maxWidth: "100%",
                maxHeight: "500px",
                objectFit: "contain",
                display: "block",
              }}
            />

            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "4px",
                padding: "4px 8px",
                color: "#fff",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ZoomIn size={13} /> Zoom
            </div>
          </div>

          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "10px", textAlign: "center" }}>
            Neon caliper vectors depict vertical clearance across the segmented tibiofemoral joint space.
          </p>
        </div>

        {/* Right Column: Compartment Clearances & Meniscus Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Compartment Clearances */}
          <div className="card">
            <h2 className="card-title" style={{ fontSize: "16px", marginBottom: "14px" }}>
              Articular Compartment Clearances
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
              {(["A", "M", "P"] as const).map((zoneKey) => {
                const z = zones[zoneKey];
                const isSelected = selectedZone === zoneKey;
                return (
                  <button
                    key={zoneKey}
                    onClick={() => setSelectedZone(zoneKey)}
                    style={{
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: isSelected ? "var(--primary-subtle)" : "var(--card-bg)",
                      padding: "12px 8px",
                      borderRadius: "8px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                      {zoneKey === "A" ? "Lateral" : zoneKey === "M" ? "Central" : "Minimum"}
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: z.color }}>
                      {z.valueText}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>
                      {z.status}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Zone Detail */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                  {activeZoneData.name}
                </span>
                <span
                  style={{
                    background: "rgba(34, 197, 94, 0.12)",
                    color: activeZoneData.color,
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {activeZoneData.status}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 12px" }}>
                {activeZoneData.desc}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>Articulation Confidence:</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                  {activeZoneData.confidence}%
                </span>
              </div>
            </div>
          </div>

          {/* Direct Meniscus Status Card */}
          <div className="card">
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "10px" }}>
              Direct Meniscus Tissue Assessment
            </h3>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "14px",
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: "1.5",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#eab308", marginBottom: "6px", fontWeight: 600 }}>
                <AlertTriangle size={15} />
                <span>Meniscus measurement unavailable for this image/model</span>
              </div>
              <p style={{ margin: 0 }}>
                Plain 2D radiograph measures bone-to-bone joint space clearance. To evaluate meniscus tears, extrusion, or internal signal derangement, MRI is the indicated modality.
              </p>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: "16px", justifyContent: "space-between", padding: "10px 16px" }}
              onClick={() => {
                const targetCaseId = analysisResult?.case_id || caseId;
                navigate(targetCaseId ? `/anatomical-measurements/${targetCaseId}` : "/anatomical-measurements");
              }}
            >
              <span>View All Anatomical Measurements</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Zoom Modal */}
      {zoomModalImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.88)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setZoomModalImage(null)}
        >
          <img
            src={zoomModalImage}
            alt="Zoomed clearance"
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px" }}
          />
          <span style={{ color: "#fff", fontSize: "13px", marginTop: "12px" }}>
            Click anywhere to close
          </span>
        </div>
      )}
    </div>
  );
};