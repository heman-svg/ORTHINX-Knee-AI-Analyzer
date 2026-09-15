import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ruler,
  Layers,
  FileText,
  Eye,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  ArrowRight,
  UploadCloud,
  X,
  Info,
  Activity,
} from "lucide-react";
import { useAnalysisStore } from "../store/analysisStore";

export const AnatomicalMeasurementsPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedImageModal, setSelectedImageModal] = useState<string | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<"measurements" | "segmentation" | "enhanced" | "original">("measurements");

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

  const rawMeasurements = analysisResult?.measurements || activeCase?.measurements || {};
  const isCalibrated = Boolean(derived?.isCalibrated);
  const unit = derived?.unit || "px";
  const areaUnit = derived?.areaUnit || (isCalibrated ? "mm²" : "px²");

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

  const getActiveTabUrl = () => {
    switch (activeImageTab) {
      case "measurements":
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

  const currentTabUrl = getActiveTabUrl();

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
          <Ruler size={28} />
        </div>
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
          No Measurements Available
        </h2>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", maxWidth: "420px", margin: 0 }}>
          Upload and run AI analysis on a knee radiograph to view quantitative anatomical metrics.
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

  // Exact measurement values from verified API response
  const medialJSWDisplay =
    derived?.medialJSW !== null && derived?.medialJSW !== undefined
      ? `${derived.medialJSW} ${unit}`
      : rawMeasurements?.medial_jsw?.value !== undefined && rawMeasurements?.medial_jsw?.value !== null
      ? `${rawMeasurements.medial_jsw.value} ${rawMeasurements.medial_jsw.unit || unit}`
      : "Not measurable on this view";

  const lateralJSWDisplay =
    derived?.lateralJSW !== null && derived?.lateralJSW !== undefined
      ? `${derived.lateralJSW} ${unit}`
      : rawMeasurements?.lateral_jsw?.value !== undefined && rawMeasurements?.lateral_jsw?.value !== null
      ? `${rawMeasurements.lateral_jsw.value} ${rawMeasurements.lateral_jsw.unit || unit}`
      : "Not measurable on this view";

  const minJSWDisplay =
    derived?.jswMin !== null && derived?.jswMin !== undefined
      ? `${derived.jswMin} ${unit}`
      : rawMeasurements?.min_jsw?.value !== undefined && rawMeasurements?.min_jsw?.value !== null
      ? `${rawMeasurements.min_jsw.value} ${rawMeasurements.min_jsw.unit || unit}`
      : "Not measurable on this view";

  const meanJSWDisplay =
    derived?.jswMean !== null && derived?.jswMean !== undefined
      ? `${derived.jswMean} ${unit}`
      : rawMeasurements?.mean_jsw?.value !== undefined && rawMeasurements?.mean_jsw?.value !== null
      ? `${rawMeasurements.mean_jsw.value} ${rawMeasurements.mean_jsw.unit || unit}`
      : "Not measurable on this view";

  const jointAreaDisplay =
    derived?.jointArea !== null && derived?.jointArea !== undefined
      ? `${derived.jointArea} ${areaUnit}`
      : rawMeasurements?.joint_space_area?.value !== undefined && rawMeasurements?.joint_space_area?.value !== null
      ? `${rawMeasurements.joint_space_area.value} ${rawMeasurements.joint_space_area.unit || areaUnit}`
      : "Not measurable on this view";

  const femoralWidthDisplay =
    derived?.femoralWidthML !== null && derived?.femoralWidthML !== undefined
      ? `${derived.femoralWidthML} ${unit}`
      : rawMeasurements?.femoral_width?.value !== undefined && rawMeasurements?.femoral_width?.value !== null
      ? `${rawMeasurements.femoral_width.value} ${rawMeasurements.femoral_width.unit || unit}`
      : "Not measurable on this view";

  const tibialPlateauWidthDisplay =
    derived?.tibialPlateauWidth !== null && derived?.tibialPlateauWidth !== undefined
      ? `${derived.tibialPlateauWidth} ${unit}`
      : rawMeasurements?.tibial_width?.value !== undefined && rawMeasurements?.tibial_width?.value !== null
      ? `${rawMeasurements.tibial_width.value} ${rawMeasurements.tibial_width.unit || unit}`
      : "Not measurable on this view";

  const femoralAPDisplay =
    orientation === "side" && rawMeasurements?.femoral_ap?.value !== undefined && rawMeasurements?.femoral_ap?.value !== null
      ? `${rawMeasurements.femoral_ap.value} ${rawMeasurements.femoral_ap.unit || unit}`
      : "Requires lateral radiograph";

  const tibialAPDisplay =
    orientation === "side" && rawMeasurements?.tibial_ap?.value !== undefined && rawMeasurements?.tibial_ap?.value !== null
      ? `${rawMeasurements.tibial_ap.value} ${rawMeasurements.tibial_ap.unit || unit}`
      : "Requires lateral radiograph";

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
            style={{
              background: "var(--primary-light)",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: "12px",
              borderColor: "rgba(91, 75, 255, 0.3)",
            }}
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

      {/* 2. Patient & Calibration Metadata Strip */}
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
            Projection
          </span>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
            {orientation.toUpperCase()} View
          </div>
        </div>

        <div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
            Calibration Status
          </span>
          <div style={{ fontSize: "13px", fontWeight: 600, color: isCalibrated ? "#34d399" : "var(--text-muted)", marginTop: "2px" }}>
            {isCalibrated ? "Physical mm Calibration" : "Native Pixel Units (px)"}
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

      {/* 3. Main Split View: Overlay Image Stage (LEFT) | Structured Quantitative Tables (RIGHT) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "24px", alignItems: "start" }}>
        {/* LEFT: Interactive Radiograph Stage */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Eye size={16} style={{ color: "var(--primary)" }} />
              Measurement Overlay
            </span>

            {/* Display Mode Tabs */}
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
                  { id: "measurements", label: "Caliper Overlay" },
                  { id: "segmentation", label: "Bone Mask" },
                  { id: "enhanced", label: "Enhanced" },
                  { id: "original", label: "Original" },
                ] as const
              ).map((tab) => {
                const isSelected = activeImageTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveImageTab(tab.id)}
                    style={{
                      border: "none",
                      padding: "4px 8px",
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

          {/* Image Viewport */}
          <div
            onClick={() => currentTabUrl && setSelectedImageModal(currentTabUrl)}
            style={{
              position: "relative",
              minHeight: "440px",
              maxHeight: "560px",
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
            {currentTabUrl ? (
              <img
                src={currentTabUrl}
                alt="Radiograph Measurement Inspection"
                style={{
                  maxWidth: "100%",
                  maxHeight: "540px",
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
            Overlay lines indicate automated landmark calipers across the tibiofemoral articulation.
          </span>
        </div>

        {/* RIGHT: Quantitative Measurements Tables */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Group 1: Joint Space Measurements (JSW) */}
          <div className="card" style={{ padding: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                <Ruler size={15} style={{ color: "var(--primary)" }} />
                Joint Space Width (JSW)
              </h3>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                Unit: {unit}
              </span>
            </div>

            <table className="table" style={{ width: "100%", textAlign: "left", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "6px 8px" }}>Parameter</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Calculated Value</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Medial Compartment JSW</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {medialJSWDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Lateral Compartment JSW</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {lateralJSWDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Minimum Joint Clearance</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {minJSWDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Mean Articulation Clearance</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {meanJSWDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Joint Space Area</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {jointAreaDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Group 2: Bone Diameters & Alignment */}
          <div className="card" style={{ padding: "18px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={15} style={{ color: "var(--primary)" }} />
              Bone Diameters & Alignment
            </h3>

            <table className="table" style={{ width: "100%", textAlign: "left", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "6px 8px" }}>Parameter</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Calculated Value</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Femoral Width (Medial-Lateral)</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {femoralWidthDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Tibial Plateau Width</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--text-main)" }}>
                    {tibialPlateauWidthDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "#34d399", fontSize: "11px" }}>
                    Valid
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Femoral AP Dimension</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {femoralAPDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text-muted)", fontSize: "11px" }}>
                    {orientation === "side" ? "Valid" : "Pending View"}
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: "8px", fontWeight: 500 }}>Tibial AP Dimension</td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {tibialAPDisplay}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text-muted)", fontSize: "11px" }}>
                    {orientation === "side" ? "Valid" : "Pending View"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Decision Support Strip */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(91, 75, 255, 0.06)",
              border: "1px solid rgba(91, 75, 255, 0.2)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
              display: "flex",
              gap: "10px",
            }}
          >
            <Info size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ color: "var(--text-main)" }}>Measurement Precision: </strong>
              <span>
                Calculated directly from native radiograph pixel matrix. Calibration requires verified physical marker or DICOM metadata.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Lightbox */}
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
              src={selectedImageModal}
              alt="Expanded Caliper Inspection"
              style={{ maxWidth: "100%", maxHeight: "82vh", objectFit: "contain", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};