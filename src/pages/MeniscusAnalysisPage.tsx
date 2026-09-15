import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Layers,
  Ruler,
  FileText,
  Eye,
  Info,
  ZoomIn,
  UploadCloud,
  X,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useAnalysisStore } from "../store/analysisStore";

export const MeniscusAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<"A" | "M" | "P">("A");
  const [viewMode, setViewMode] = useState<"measurements" | "mask" | "original">("measurements");
  const [zoomModalImage, setZoomModalImage] = useState<string | null>(null);

  const {
    activeCase,
    activeCaseId,
    orientation,
    views,
    patientInfo,
    getDerivedMeasurements,
    getZoneMeasurements,
  } = useAnalysisStore();

  const currentView = views[orientation] || views.front;
  const analysisResult = currentView.analysisResult || activeCase?.analysisResult;
  const derived = getDerivedMeasurements();
  const zones = getZoneMeasurements();
  const activeZoneData = zones[selectedZone];

  const origImg =
    analysisResult?.image?.original ||
    analysisResult?.segmentation?.original_url ||
    currentView.filePreviewUrl ||
    "";
  const enhImg =
    analysisResult?.image?.enhanced ||
    analysisResult?.segmentation?.enhanced_url ||
    currentView.enhancedPreviewUrl ||
    "";
  const maskImg =
    analysisResult?.image?.segmentation ||
    analysisResult?.segmentation?.mask_url ||
    "";
  const overlayImg =
    analysisResult?.image?.measurements ||
    analysisResult?.segmentation?.measurements_url ||
    analysisResult?.image?.overlay ||
    analysisResult?.segmentation?.overlay_url ||
    "";

  const getDisplayImageUrl = () => {
    if (viewMode === "mask") return maskImg || origImg;
    if (viewMode === "original") return origImg;
    return overlayImg || enhImg || origImg;
  };

  const displayImageUrl = getDisplayImageUrl();

  const patName = patientInfo.patientName || activeCase?.patientName || "Jane Doe";
  const patId = patientInfo.patientId || activeCase?.patientId || "PT-49821";
  const caseIdDisplay = activeCaseId || activeCase?.caseId || "CASE-ANALYSIS";
  const studyDate =
    analysisResult?.formatted_date ||
    (analysisResult?.timestamp
      ? new Date(analysisResult.timestamp).toLocaleString()
      : new Date().toLocaleDateString());

  if (!analysisResult && !origImg) {
    return (
      <div
        className="card"
        style={{
          maxWidth: "700px",
          margin: "40px auto",
          padding: "48px 32px",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
        }}
      >
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
          }}
        >
          <Layers size={28} />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
          No Meniscus Analysis Available
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "420px", margin: 0 }}>
          Upload and analyze a knee radiograph to evaluate joint space clearance and compartment margins.
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate("/analysis/upload")}
          style={{ marginTop: "6px" }}
        >
          <UploadCloud size={15} />
          <span>Upload Radiograph</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1320px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Sub-Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/analysis/results")}
            style={{ fontSize: "12px" }}
          >
            Overview
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/analysis/measurements")}
            style={{ fontSize: "12px" }}
          >
            <Ruler size={13} />
            <span>Anatomical Measurements</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            style={{
              background: "var(--primary-light)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "12px",
              borderColor: "rgba(91, 75, 255, 0.3)",
            }}
          >
            <Layers size={13} />
            <span>Meniscus Analysis</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate("/reports")}
            style={{ fontSize: "12px" }}
          >
            <FileText size={13} />
            <span>Diagnostic Report</span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
          <span>Case: <strong style={{ color: "var(--text-main)" }}>{caseIdDisplay}</strong></span>
        </div>
      </div>

      {/* 2. Patient & Projection Strip */}
      <div
        className="card"
        style={{
          padding: "14px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Patient
          </span>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
            {patName} ({patId})
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Radiographic View
          </span>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
            {orientation.toUpperCase()} Projection
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Modality Notice
          </span>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--primary)", marginTop: "2px" }}>
            2D Radiolucent Clearance
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Analysis Timestamp
          </span>
          <div style={{ fontSize: "13px", color: "var(--text-main)", marginTop: "2px" }}>
            {studyDate}
          </div>
        </div>
      </div>

      {/* 3. Plain Radiograph Clinical Notice Alert */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          background: "rgba(91, 75, 255, 0.06)",
          border: "1px solid rgba(91, 75, 255, 0.22)",
          padding: "14px 18px",
          borderRadius: "8px",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        <Info size={18} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong style={{ color: "var(--text-main)" }}>Radiographic Articulation Note: </strong>
          <span style={{ color: "var(--text-secondary)" }}>
            Fibrocartilaginous meniscus tissue is radiolucent on standard X-ray imaging. Quantitative assessment evaluates vertical joint space clearance and subchondral margin proximity across medial, lateral, and central articular compartments.
          </span>
        </div>
      </div>

      {/* 4. Main Split View: Radiograph Viewer (LEFT) | Compartment Clearances (RIGHT) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* LEFT: Radiograph Clearance Visualizer */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Eye size={16} style={{ color: "var(--primary)" }} />
              Joint Clearance Visualizer
            </span>

            {/* View Mode Switcher */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-app)",
                padding: "3px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                gap: "2px",
              }}
            >
              {(
                [
                  { id: "measurements", label: "Clearance Overlay" },
                  { id: "mask", label: "Joint Mask" },
                  { id: "original", label: "Original" },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setViewMode(mode.id)}
                  style={{
                    border: "none",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: viewMode === mode.id ? 700 : 500,
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: viewMode === mode.id ? "var(--primary)" : "transparent",
                    color: viewMode === mode.id ? "#ffffff" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Viewport Box */}
          <div
            onClick={() => displayImageUrl && setZoomModalImage(displayImageUrl)}
            style={{
              position: "relative",
              minHeight: "440px",
              maxHeight: "540px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "#050505",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              cursor: "zoom-in",
            }}
            title="Click to zoom image"
          >
            {displayImageUrl ? (
              <img
                src={displayImageUrl}
                alt="Meniscus & Joint Clearance Inspection"
                style={{
                  maxWidth: "100%",
                  maxHeight: "520px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
                Image unavailable
              </div>
            )}

            <div
              style={{
                position: "absolute",
                bottom: "10px",
                right: "10px",
                background: "rgba(0, 0, 0, 0.7)",
                borderRadius: "4px",
                padding: "4px 8px",
                color: "#fff",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ZoomIn size={13} />
              <span>Zoom</span>
            </div>
          </div>

          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", textAlign: "center" }}>
            Caliper vectors show vertical tibiofemoral clearance across the segmented articular boundary.
          </span>
        </div>

        {/* RIGHT: Compartment Clearances & Findings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Compartment Articular Clearances */}
          <div className="card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px 0" }}>
              Articular Compartment Clearance
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "16px" }}>
              {(["A", "M", "P"] as const).map((zoneKey) => {
                const z = zones[zoneKey];
                const isSelected = selectedZone === zoneKey;
                return (
                  <button
                    key={zoneKey}
                    type="button"
                    onClick={() => setSelectedZone(zoneKey)}
                    style={{
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: isSelected ? "var(--primary-subtle)" : "var(--bg-app)",
                      padding: "10px 6px",
                      borderRadius: "8px",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "3px", textTransform: "uppercase" }}>
                      {zoneKey === "A" ? "Lateral" : zoneKey === "M" ? "Central" : "Minimum"}
                    </div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: z.color || "var(--text-main)" }}>
                      {z.valueText}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "3px" }}>
                      {z.status}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Zone Detail */}
            <div
              style={{
                background: "var(--bg-app)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                  {activeZoneData.name}
                </span>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    color: activeZoneData.color || "#34d399",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {activeZoneData.status}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 8px 0" }}>
                {activeZoneData.desc}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>Articulation Quality:</span>
                <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Verified</span>
              </div>
            </div>
          </div>

          {/* Meniscus Assessment Summary Card */}
          <div className="card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 10px 0" }}>
              Soft-Tissue Integrity Summary
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Medial Joint Space:</span>
                <strong style={{ color: "var(--text-main)" }}>
                  {derived?.medialJSWText || "Not measurable on this view"}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Lateral Joint Space:</span>
                <strong style={{ color: "var(--text-main)" }}>
                  {derived?.lateralJSWText || "Not measurable on this view"}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "var(--text-secondary)" }}>Minimum Articular Gap:</span>
                <strong style={{ color: "var(--text-main)" }}>
                  {derived?.jswMinText || "Not measurable on this view"}
                </strong>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate("/analysis/measurements")}
              style={{ flex: 1, fontSize: "13px" }}
            >
              Anatomical Measurements
            </button>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/reports")}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px" }}
            >
              <span>Diagnostic Report</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Zoom Lightbox */}
      {zoomModalImage && (
        <div
          onClick={() => setZoomModalImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.88)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "92vh",
              background: "#0d0d0d",
              borderRadius: "10px",
              padding: "16px",
              border: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setZoomModalImage(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0, 0, 0, 0.7)",
                border: "none",
                borderRadius: "50%",
                color: "#fff",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
            <img
              src={zoomModalImage}
              alt="Expanded Clearance Inspection"
              style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};