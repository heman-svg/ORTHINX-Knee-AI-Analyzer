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
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import kneeMri from "../assets/knee_mri.jpg";
import femurMeasurement from "../assets/femur_measurement.png";
import tibiaMeasurement from "../assets/tibia_measurement.png";
import meniscusThicknessAmp from "../assets/meniscus_thickness_amp.png";

export const MeniscusAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("meniscus");
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<"A" | "M" | "P">("A");
  const [gaugeProgress, setGaugeProgress] = useState(0);

  const tabs = [
    { id: "overview", label: "Overview", path: "/analysis/results" },
    { id: "meniscus", label: "Meniscus Analysis", path: "/analysis/meniscus" },
    { id: "measurements", label: "Anatomical Measurements", path: "/analysis/measurements" },
    { id: "implant", label: "Implant Recommendation", path: "/implant-planning" },
  ];

  const zoneData = {
    A: {
      name: "Anterior (A)",
      thickness: "3.6 mm",
      status: "Preserved",
      color: "#10B981",
      desc: "Anterior zone measurement: 3.6 mm thickness with intact vascular outer zone.",
      confidence: 96,
      confText: "High Confidence",
      confColor: "var(--success)",
      confClass: "badge-success",
    },
    M: {
      name: "Middle (M)",
      thickness: "3.2 mm",
      status: "Normal",
      color: "#10B981",
      desc: "Middle body segment: 3.2 mm thickness within physiological parameters.",
      confidence: 92,
      confText: "High Confidence",
      confColor: "var(--success)",
      confClass: "badge-success",
    },
    P: {
      name: "Posterior (P)",
      thickness: "2.8 mm",
      status: "Reduced",
      color: "#F59E0B",
      desc: "Posterior horn: 2.8 mm thickness indicating focal thinning in load-bearing region.",
      confidence: 74,
      confText: "Moderate Confidence",
      confColor: "var(--warning)",
      confClass: "badge-warning",
    },
  };

  useEffect(() => {
    setGaugeProgress(0);
    const timer = setTimeout(() => {
      setGaugeProgress(zoneData[activeZone].confidence);
    }, 150);
    return () => clearTimeout(timer);
  }, [activeZone]);

  const handleGenerateReport = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1400));
  };

  const handleDownloadPdf = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  };

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
                fontWeight: tab.id === "meniscus" ? 600 : 500,
                color: tab.id === "meniscus" ? "var(--primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${tab.id === "meniscus" ? "var(--primary)" : "transparent"}`,
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
          onClick={() => alert("Study Case ID: STD-2025-9843-KNEE")}
        >
          <Sparkles size={14} color="var(--primary)" />
          <span>Case #STD-9843</span>
        </button>
      </div>

      {/* 4-Panel Medical Visualizations Grid with User Bone Images */}
      <div className="mri-grid">
        {/* Panel 1: Original MRI */}
        <div className="mri-panel">
          <div className="mri-panel-header">
            <span>Original MRI</span>
            <span style={{ fontSize: "11px", color: "var(--text-light)" }}>Sagittal T1</span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => setSelectedImageModal(kneeMri)}
            style={{ cursor: "pointer" }}
          >
            <img src={kneeMri} alt="Original MRI" className="mri-image-sagittal" />
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "12px",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: 700,
                textShadow: "0 0 4px #000",
              }}
            >
              R
            </div>
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
            <span>AI Segmentation</span>
            <span style={{ fontSize: "11px", color: "#a855f7" }}>Femur (68.4 mm)</span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => setSelectedImageModal(femurMeasurement)}
            style={{ cursor: "pointer" }}
          >
            <img src={femurMeasurement} alt="Femur AI Segmentation" className="mri-image" />
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
            <span>Meniscus Thickness</span>
            <span style={{ fontSize: "11px", color: "#10b981" }}>Tibia (71.8 mm)</span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => setSelectedImageModal(tibiaMeasurement)}
            style={{ cursor: "pointer" }}
          >
            <img src={tibiaMeasurement} alt="Tibia Plateau Segmentation" className="mri-image" />
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

        {/* Panel 4: Meniscus Thickness A-M-P Profile with Table */}
        <div className="mri-panel">
          <div className="mri-panel-header">
            <span>Meniscus Thickness</span>
            <span style={{ fontSize: "11px", color: "#fbbf24" }}>A-M-P (3.2 mm Avg)</span>
          </div>
          <div
            className="mri-panel-content"
            onClick={() => setSelectedImageModal(meniscusThicknessAmp)}
            style={{ cursor: "pointer" }}
          >
            <img src={meniscusThicknessAmp} alt="Meniscus Thickness A-M-P" className="mri-image" />
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

      {/* Interactive Zone Inspector Pill Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "var(--bg-surface)",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          marginBottom: "20px",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Layers size={16} color="var(--primary)" /> Zone Breakdown:
        </span>
        {(["A", "M", "P"] as const).map((z) => (
          <button
            key={z}
            onClick={() => setActiveZone(z)}
            style={{
              border: "1px solid",
              borderColor: activeZone === z ? "var(--primary)" : "var(--border)",
              background: activeZone === z ? "var(--primary-light)" : "var(--bg-surface)",
              color: activeZone === z ? "var(--primary)" : "var(--text-secondary)",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.18s ease",
            }}
          >
            <span>{zoneData[z].name}</span>
            <span style={{ fontWeight: 700, color: zoneData[z].color }}>{zoneData[z].thickness}</span>
          </button>
        ))}
        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "auto" }}>
          {zoneData[activeZone].desc}
        </span>
      </div>

      {/* Bottom Row: AI Confidence Score + Summary + Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1.5fr 1fr", gap: "20px" }}>
        {/* AI Confidence Score */}
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "16px" }}>
            AI Confidence Score
          </h3>

          <div style={{ position: "relative", width: "100px", height: "100px", margin: "0 auto 12px" }}>
            <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--border-light)"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={zoneData[activeZone].confColor}
                strokeWidth="3.5"
                strokeDasharray={`${gaugeProgress}, 100`}
                style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--text-main)",
              }}
            >
              {gaugeProgress}%
            </div>
          </div>

          <span className={`badge ${zoneData[activeZone].confClass}`}>
            {zoneData[activeZone].confText}
          </span>
        </div>

        {/* Summary Card */}
        <div className="card">
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginBottom: "14px" }}>
            Summary
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-main)" }}>
              <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <span>Medial meniscus thickness is reduced.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-main)" }}>
              <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <span>Measurements extracted successfully.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-main)" }}>
              <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
              <span>Implant Size 4 is the best match.</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
              <Info size={16} color="var(--info)" style={{ flexShrink: 0 }} />
              <span>Clinical correlation is recommended.</span>
            </div>
          </div>
        </div>

        {/* Right Actions with Animated Buttons */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "14px" }}>
          <AnimatedButton
            icon={<FileText size={16} />}
            loadingText="Generating Report..."
            successText="Report Ready!"
            onClick={handleGenerateReport}
            onSuccess={() => navigate("/reports")}
            style={{ width: "100%", borderRadius: "10px" }}
          >
            View Full Report
          </AnimatedButton>

          <AnimatedButton
            variant="outline"
            icon={<Download size={16} />}
            loadingText="Exporting DICOM..."
            successText="Export Completed"
            onClick={handleDownloadPdf}
            style={{ width: "100%", borderRadius: "10px" }}
          >
            Download Report
          </AnimatedButton>
        </div>
      </div>

      {/* Modal Zoom View */}
      {selectedImageModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
          onClick={() => setSelectedImageModal(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "880px",
              maxHeight: "88vh",
              borderRadius: "16px",
              overflow: "hidden",
              background: "#000000",
              border: "1px solid var(--border)",
              padding: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImageModal}
              alt="Zoomed Medical Imaging"
              style={{ width: "100%", height: "auto", maxHeight: "80vh", objectFit: "contain", display: "block" }}
            />
            <button
              onClick={() => setSelectedImageModal(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(0,0,0,0.7)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "34px",
                height: "34px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};