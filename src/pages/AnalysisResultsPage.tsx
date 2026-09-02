import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Info,
  Download,
  FileText,
  Layers,
  Sparkles,
  ZoomIn,
  Ruler,
  Database,
  ArrowRight,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { useAnalysisStore } from "../store/analysisStore";

export const AnalysisResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<"A" | "M" | "P">("A");
  const [gaugeProgress, setGaugeProgress] = useState(0);

  const {
    uploadedFileName,
    filePreviewUrl,
    analysisResult,
    caseId,
    getDerivedMeasurements,
    getZoneMeasurements,
  } = useAnalysisStore();

  const derived = getDerivedMeasurements();
  const zones = getZoneMeasurements();
  const activeZoneData = zones[activeZone];

  const tabs = [
    { id: "overview", label: "Overview", path: "/analysis/results" },
    { id: "meniscus", label: "Meniscus Analysis", path: "/meniscus-analysis" },
    { id: "measurements", label: "Anatomical Measurements", path: "/anatomical-measurements" },
    { id: "implant", label: "Implant Planning", path: "/implant-planning" },
  ];

  useEffect(() => {
    const score = Math.round(derived?.qualityScore || 92);
    const timer = setTimeout(() => {
      setGaugeProgress(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [derived]);

  const origImg = analysisResult?.image?.original || analysisResult?.segmentation?.original_url || filePreviewUrl || "";
  const enhImg = analysisResult?.image?.enhanced || analysisResult?.segmentation?.enhanced_url || filePreviewUrl || "";
  const maskImg = analysisResult?.image?.segmentation || analysisResult?.segmentation?.mask_url || filePreviewUrl || "";
  const measImg = analysisResult?.image?.measurements || analysisResult?.segmentation?.measurements_url || analysisResult?.image?.overlay || filePreviewUrl || "";

  return (
    <div>
      {/* Sub-Navigation Tabs Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", gap: "24px" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                navigate(tab.path);
              }}
              style={{
                border: "none",
                background: "none",
                padding: "12px 4px",
                fontSize: "14px",
                fontWeight: tab.id === "overview" ? 600 : 500,
                color: tab.id === "overview" ? "var(--primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${tab.id === "overview" ? "var(--primary)" : "transparent"}`,
                cursor: "pointer",
                marginBottom: "-1px",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "6px" }}
          onClick={() => alert(`Active Case: ${uploadedFileName || "Knee Radiograph"}`)}
        >
          <Sparkles size={14} color="var(--primary)" />
          <span>Case: {uploadedFileName ? uploadedFileName.slice(0, 16) : "None"}</span>
        </button>
      </div>

      {/* 4-Panel Synchronized Viewports */}
      <div className="mri-viewport-grid">
        {/* Panel 1: Original Knee Radiograph */}
        <div className="mri-panel">
          <div className="mri-panel-header">
            <span>Original Radiograph</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Front (AP)</span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => origImg && setSelectedImageModal(origImg)}
            style={{ cursor: "pointer" }}
          >
            {origImg ? (
              <img src={origImg} alt="Original Knee Radiograph" className="mri-image" />
            ) : (
              <div style={{ padding: "40px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                No radiograph loaded
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "4px",
                padding: "4px",
                color: "#fff",
              }}
            >
              <ZoomIn size={14} />
            </div>
          </div>
        </div>

        {/* Panel 2: Femur Segmentation & Dimensions */}
        <div className="mri-panel">
          <div className="mri-panel-header">
            <span>AI Segmentation Mask</span>
            <span style={{ fontSize: "11px", color: "#a855f7" }}>
              Femur ({derived?.femoralWidthMLText || "Image-derived"})
            </span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => maskImg && setSelectedImageModal(maskImg)}
            style={{ cursor: "pointer" }}
          >
            {maskImg ? (
              <img src={maskImg} alt="Femur AI Segmentation" className="mri-image" />
            ) : (
              <div style={{ padding: "40px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                Run analysis to view
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "4px",
                padding: "4px",
                color: "#fff",
              }}
            >
              <ZoomIn size={14} />
            </div>
          </div>
        </div>

        {/* Panel 3: Tibia Segmentation & Dimensions */}
        <div className="mri-panel">
          <div className="mri-panel-header">
            <span>Measurements Overlay</span>
            <span style={{ fontSize: "11px", color: "#10b981" }}>
              Tibia ({derived?.tibialPlateauWidthText || "Image-derived"})
            </span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => measImg && setSelectedImageModal(measImg)}
            style={{ cursor: "pointer" }}
          >
            {measImg ? (
              <img src={measImg} alt="Tibia Plateau Segmentation" className="mri-image" />
            ) : (
              <div style={{ padding: "40px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                Run analysis to view
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "4px",
                padding: "4px",
                color: "#fff",
              }}
            >
              <ZoomIn size={14} />
            </div>
          </div>
        </div>

        {/* Panel 4: Enhanced View */}
        <div className="mri-panel">
          <div className="mri-panel-header">
            <span>Enhanced Radiograph</span>
            <span style={{ fontSize: "11px", color: "#fbbf24" }}>
              JSW ({derived?.medialJSWText || "Clearance"})
            </span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => enhImg && setSelectedImageModal(enhImg)}
            style={{ cursor: "pointer" }}
          >
            {enhImg ? (
              <img src={enhImg} alt="Enhanced Radiograph" className="mri-image" />
            ) : (
              <div style={{ padding: "40px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                Click enhance to view
              </div>
            )}
            <div
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "4px",
                padding: "4px",
                color: "#fff",
              }}
            >
              <ZoomIn size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <div className="stat-label">Femoral Mediolateral Width</div>
          <div className="stat-value-wrap">
            <div className="stat-number">{derived?.femoralWidthMLText || "—"}</div>
            <span className="badge badge-primary">Front (AP)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Tibial Plateau Width</div>
          <div className="stat-value-wrap">
            <div className="stat-number">{derived?.tibialPlateauWidthText || "—"}</div>
            <span className="badge badge-primary">Front (AP)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Medial Joint Space Width</div>
          <div className="stat-value-wrap">
            <div className="stat-number" style={{ color: "#22c55e" }}>{derived?.medialJSWText || "—"}</div>
            <span className="badge badge-success">Clearance</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Femoral AP Dimension</div>
          <div className="stat-value-wrap">
            <div className="stat-number" style={{ fontSize: derived?.femoralAP ? "24px" : "13px", color: derived?.femoralAP ? "#a855f7" : "var(--text-muted)" }}>
              {derived?.femoralAPText || "Lateral view required"}
            </div>
            <span className="badge badge-secondary">Lateral</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const targetCaseId = analysisResult?.case_id || caseId;
            navigate(targetCaseId ? `/anatomical-measurements/${targetCaseId}` : "/anatomical-measurements");
          }}
        >
          <Ruler size={16} />
          <span>Detailed Anatomical Measurements</span>
        </button>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/implant-planning")}
        >
          <Sparkles size={16} />
          <span>Proceed to Implant Planning</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Image Zoom Modal */}
      {selectedImageModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
          onClick={() => setSelectedImageModal(null)}
        >
          <img
            src={selectedImageModal}
            alt="Enlarged View"
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: "8px" }}
          />
        </div>
      )}
    </div>
  );
};