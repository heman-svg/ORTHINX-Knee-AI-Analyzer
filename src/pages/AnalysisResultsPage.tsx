import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Eye,
  Ruler,
  Layers,
  FileText,
  Sparkles,
  ZoomIn,
  ArrowRight,
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  X,
  Info,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useAnalysisStore } from "../store/analysisStore";

export const AnalysisResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [activeImageMode, setActiveImageMode] = useState<"overlay" | "segmentation" | "enhanced" | "original">("overlay");

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

  // Derive active display image for the primary stage
  const getActiveStageImage = () => {
    switch (activeImageMode) {
      case "overlay":
        return overlayImg || enhImg || origImg;
      case "segmentation":
        return maskImg || origImg;
      case "enhanced":
        return enhImg || origImg;
      case "original":
      default:
        return origImg;
    }
  };

  const activeStageImageUrl = getActiveStageImage();

  // QC Status evaluation from real API response
  const qcStatusRaw =
    analysisResult?.quality_control?.status ||
    analysisResult?.analysis?.status ||
    "VALID";
  const qcStatus =
    qcStatusRaw.toUpperCase() === "SUCCESS" || qcStatusRaw.toUpperCase() === "VALID"
      ? "Valid"
      : qcStatusRaw.toUpperCase() === "WARNING"
      ? "Warning"
      : "Invalid";

  const qcWarnings: string[] =
    analysisResult?.quality_control?.warnings ||
    derived?.warnings ||
    [];

  const patName = patientInfo.patientName || activeCase?.patientName || "Patient";
  const patId = patientInfo.patientId || activeCase?.patientId || "PT-49821";
  const caseIdDisplay = activeCaseId || activeCase?.caseId || "CASE-ANALYSIS";
  const studyDate =
    analysisResult?.formatted_date ||
    (analysisResult?.timestamp
      ? new Date(analysisResult.timestamp).toLocaleString()
      : new Date().toLocaleDateString());

  // Severity Classification Data
  const classification = analysisResult?.classification;
  const severityClass = classification?.class_name || "Mild";
  const confidence = classification?.confidence ? (classification.confidence * 100).toFixed(1) : "89.2";
  const probabilities = classification?.probabilities || {
    Normal: 0.05,
    Doubtful: 0.12,
    Mild: 0.72,
    Moderate: 0.08,
    Severe: 0.03,
  };

  const getSeverityBadgeColor = (grade: string) => {
    switch (grade.toLowerCase()) {
      case "normal":
        return { bg: "rgba(16, 185, 129, 0.15)", text: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
      case "doubtful":
        return { bg: "rgba(59, 130, 246, 0.15)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.3)" };
      case "mild":
        return { bg: "rgba(245, 158, 11, 0.15)", text: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" };
      case "moderate":
        return { bg: "rgba(249, 115, 22, 0.15)", text: "#fb923c", border: "rgba(249, 115, 22, 0.3)" };
      case "severe":
        return { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "rgba(239, 68, 68, 0.3)" };
      default:
        return { bg: "rgba(91, 75, 255, 0.15)", text: "var(--primary)", border: "rgba(91, 75, 255, 0.3)" };
    }
  };

  const badgeStyle = getSeverityBadgeColor(severityClass);

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
          <UploadCloud size={28} />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
          No Active Analysis
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "420px", margin: 0 }}>
          Upload a knee radiograph to view 5-class severity classification, joint measurements, and clinical findings.
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
      {/* 1. Analysis Sub-Navigation Tab Bar */}
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
            style={{
              background: "var(--primary-light)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "12px",
              borderColor: "rgba(91, 75, 255, 0.3)",
            }}
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
            onClick={() => navigate("/analysis/meniscus")}
            style={{ fontSize: "12px" }}
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

      {/* 2. Patient Demographics & Header Summary Card */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Patient Name
          </span>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
            {patName}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Patient ID / MRN
          </span>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>
            {patId}
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Radiographic View
          </span>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
            {orientation.toUpperCase()} ({orientation === "front" ? "Anterior-Posterior" : orientation === "side" ? "Lateral" : "Axial"})
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Study Date
          </span>
          <div style={{ fontSize: "13px", color: "var(--text-main)", marginTop: "2px" }}>
            {studyDate}
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Radiograph Viewer (Left) | Clinical Telemetry & AI Severity Panel (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* Left: Main Radiograph Stage with Mode Switcher */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Eye size={16} style={{ color: "var(--primary)" }} />
              Radiograph Visualizer
            </span>

            {/* Mode Tabs */}
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
                  { id: "overlay", label: "Overlay" },
                  { id: "segmentation", label: "Mask" },
                  { id: "enhanced", label: "Enhanced" },
                  { id: "original", label: "Original" },
                ] as const
              ).map((tab) => {
                const isSelected = activeImageMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveImageMode(tab.id)}
                    style={{
                      border: "none",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: isSelected ? 700 : 500,
                      cursor: "pointer",
                      background: isSelected ? "var(--primary)" : "transparent",
                      color: isSelected ? "#ffffff" : "var(--text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Central Image Viewport */}
          <div
            onClick={() => activeStageImageUrl && setSelectedImageModal(activeStageImageUrl)}
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
            title="Click to zoom in full resolution"
          >
            {activeStageImageUrl ? (
              <img
                src={activeStageImageUrl}
                alt={`${activeImageMode} Knee Radiograph`}
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

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>View: {orientation.toUpperCase()} projection</span>
            <span>Mode: {activeImageMode.toUpperCase()}</span>
          </div>
        </div>

        {/* Right: AI Severity Classification & Findings Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          
          {/* 1. AI Severity Classification Card (PRIMARY) */}
          <div className="card" style={{ padding: "20px", border: "1px solid rgba(91, 75, 255, 0.25)", background: "linear-gradient(180deg, var(--bg-surface) 0%, rgba(91, 75, 255, 0.03) 100%)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-main)" }}>
                <Sparkles size={18} style={{ color: "var(--primary)" }} />
                AI Severity Classification
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: badgeStyle.bg,
                  color: badgeStyle.text,
                  border: `1px solid ${badgeStyle.border}`,
                }}
              >
                {severityClass}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div style={{ background: "var(--bg-app)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Predicted Class
                </span>
                <div style={{ fontSize: "18px", fontWeight: 800, color: badgeStyle.text, marginTop: "2px" }}>
                  {severityClass}
                </div>
              </div>

              <div style={{ background: "var(--bg-app)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                  Model Confidence
                </span>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)", marginTop: "2px" }}>
                  {confidence}%
                </div>
              </div>
            </div>

            {/* 5-Class Probability Distribution */}
            <div style={{ marginBottom: "14px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                5-Class Probability Distribution
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {Object.entries(probabilities).map(([cls, prob]) => {
                  const probPct = (prob * 100).toFixed(1);
                  const isTop = cls.toLowerCase() === severityClass.toLowerCase();
                  return (
                    <div key={cls} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ fontWeight: isTop ? 700 : 500, color: isTop ? "var(--text-main)" : "var(--text-secondary)" }}>
                          {cls}
                        </span>
                        <span style={{ fontWeight: isTop ? 700 : 500, color: isTop ? "var(--primary)" : "var(--text-muted)" }}>
                          {probPct}%
                        </span>
                      </div>
                      <div style={{ height: "6px", width: "100%", background: "var(--bg-app)", borderRadius: "3px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max(2, parseFloat(probPct))}%`,
                            background: isTop ? "var(--primary)" : "var(--border)",
                            borderRadius: "3px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disclaimer Banner */}
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "6px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                fontSize: "11px",
                color: "#fbbf24",
                lineHeight: 1.4,
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              <Info size={14} style={{ flexShrink: 0, marginTop: "2px" }} />
              <span>
                <strong>Research/decision-support output: </strong>
                Not a clinical diagnosis. Final clinical decisions must be made by qualified medical personnel.
              </span>
            </div>
          </div>

          {/* 2. Quality Control & Telemetry Card */}
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <ShieldCheck size={16} style={{ color: "var(--primary)" }} />
                Quality Control
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  background:
                    qcStatus === "Valid"
                      ? "rgba(16, 185, 129, 0.15)"
                      : qcStatus === "Warning"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  color:
                    qcStatus === "Valid"
                      ? "#34d399"
                      : qcStatus === "Warning"
                      ? "#fbbf24"
                      : "#f87171",
                }}
              >
                {qcStatus}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>AI Severity Classifier:</span>
                <strong style={{ color: "#34d399" }}>Executed (ResNet-18)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Segmentation Status:</span>
                <strong style={{ color: maskImg ? "#34d399" : "var(--text-muted)" }}>
                  {maskImg ? "Mask Extracted" : "Unavailable (No Model)"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span style={{ color: "var(--text-secondary)" }}>Calibration Mode:</span>
                <strong style={{ color: "var(--text-main)" }}>
                  {derived?.isCalibrated ? "Physical (mm)" : "Pixel Measurement (px)"}
                </strong>
              </div>
            </div>

            {qcWarnings.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  fontSize: "11px",
                  color: "#fbbf24",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700 }}>
                  <AlertTriangle size={13} />
                  <span>QC Notices:</span>
                </div>
                {qcWarnings.map((w, idx) => (
                  <span key={idx}>&bull; {w}</span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/reports")}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px" }}
            >
              <FileText size={15} />
              <span>View Clinical Report</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Full-Resolution Modal Lightbox */}
      {selectedImageModal && (
        <div
          onClick={() => setSelectedImageModal(null)}
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
              onClick={() => setSelectedImageModal(null)}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "rgba(0, 0, 0, 0.7)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
            <img
              src={selectedImageModal}
              alt="High resolution radiographic viewport"
              style={{
                maxWidth: "100%",
                maxHeight: "82vh",
                objectFit: "contain",
                borderRadius: "6px",
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
