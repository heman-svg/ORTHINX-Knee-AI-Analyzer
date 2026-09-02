import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Calendar,
  Ruler,
  Info,
  ArrowRight,
  UploadCloud,
  Database,
  Eye,
  ShieldCheck,
  Layers,
  Sparkles,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { InteractiveTrendChart } from "../components/ui/InteractiveTrendChart";
import { useAnalysisStore, AnatomicalOrientation } from "../store/analysisStore";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [viewOrientation, setViewOrientation] = useState<AnatomicalOrientation>("front");
  const [activeTab, setActiveTab] = useState<"original" | "measurements" | "segmentation">("measurements");

  const {
    activeCase,
    views,
    uploadedFileName,
    resetActiveCase,
    getDerivedMeasurements,
  } = useAnalysisStore();

  const safeViews: any = views || {};
  const currentView = safeViews[viewOrientation] || safeViews.front || {};
  const derived = getDerivedMeasurements();
  const hasAnalysis = Boolean(currentView?.analysisResult && currentView?.analysisStatus !== "error");

  // Get active image to display based on orientation and tab
  const getDisplayImage = () => {
    const res = currentView?.analysisResult;
    if (!res) return currentView?.filePreviewUrl || null;
    if (activeTab === "segmentation") {
      return res.image?.segmentation || res.segmentation?.mask_url || currentView?.filePreviewUrl || null;
    }
    if (activeTab === "measurements") {
      return (
        res.image?.measurements ||
        res.segmentation?.measurements_url ||
        res.image?.overlay ||
        res.segmentation?.overlay_url ||
        currentView?.filePreviewUrl ||
        null
      );
    }
    return res.image?.original || res.segmentation?.original_url || currentView?.filePreviewUrl || null;
  };

  const displayImageUrl = getDisplayImage();

  return (
    <div>
      {/* Top Welcome & KPI Metrics */}
      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}
      >
        <div>
          <h1 className="page-title">Diagnostic Dashboard</h1>
          <p className="page-subtitle">Overview of deep learning knee assessment & automated anatomical measurements</p>
        </div>

        <AnimatedButton
          icon={<Calendar size={16} />}
          loadingText="Starting Session..."
          successText="Session Ready"
          onClick={async () => {
            resetActiveCase();
            await new Promise((r) => setTimeout(r, 100));
          }}
          onSuccess={() => navigate("/knee-analysis")}
        >
          New Analysis
        </AnimatedButton>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        {/* Active Analysis Case */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={14} color="var(--primary)" /> Active Patient Case
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "20px", fontWeight: 700 }}>
              {activeCase ? activeCase.patientName || activeCase.caseId : "None active"}
            </div>
            <span
              className={`badge ${activeCase?.analysisResult ? "badge-success" : "badge-secondary"}`}
              style={{ fontSize: "10px", padding: "2px 8px" }}
            >
              {activeCase?.analysisResult ? "Analyzed" : "Idle"}
            </span>
          </div>
        </div>

        {/* Quality Score */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={14} color="var(--primary)" /> AI Quality Score
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "28px" }}>
              {derived ? `${derived.qualityScore}%` : "—"}
            </div>
            <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 8px" }}>
              {derived ? derived.qcStatus : "Awaiting scan"}
            </span>
          </div>
        </div>

        {/* Calibration Mode */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Ruler size={14} color="var(--primary)" /> Calibration Mode
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "18px", fontWeight: 700 }}>
              {derived?.isCalibrated ? "User Calibrated" : derived ? "Pixel Units (px)" : "—"}
            </div>
            <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 8px" }}>
              {derived?.unit || "Native"}
            </span>
          </div>
        </div>

        {/* Articulation Clearance */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={14} color="var(--primary)" /> Medial Articulation JSW
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "28px" }}>
              {derived?.medialJSWText || "—"}
            </div>
            <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 8px" }}>
              Image-Derived
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Actual Radiograph Viewer & Derived Measurements Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Left: Actual Radiograph Viewer with FRONT, SIDE, TOP tabs */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "20px", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} color="var(--primary)" />
                Knee Radiograph Viewer
                {hasAnalysis && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "var(--primary-subtle)",
                      color: "var(--primary)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontWeight: 600,
                    }}
                  >
                    AI Analyzed
                  </span>
                )}
              </h2>
            </div>

            {/* Display Mode Tabs */}
            {hasAnalysis && (
              <div
                style={{
                  display: "flex",
                  background: "var(--bg-app)",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                {(
                  [
                    { id: "measurements", label: "Measurements" },
                    { id: "segmentation", label: "Segmentation" },
                    { id: "original", label: "Original" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: activeTab === tab.id ? "var(--primary)" : "transparent",
                      color: activeTab === tab.id ? "#ffffff" : "var(--text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Central Image Viewport */}
          <div
            style={{
              position: "relative",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              overflow: "hidden",
              background: "#080c14",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "440px",
            }}
          >
            {displayImageUrl ? (
              <img
                src={displayImageUrl}
                alt={`${viewOrientation} Knee Radiograph`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "520px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                {viewOrientation === "front" ? (
                  <>
                    <UploadCloud size={36} color="var(--primary)" style={{ margin: "0 auto 10px", opacity: 0.8 }} />
                    <h4 style={{ color: "var(--text-main)", fontSize: "15px", marginBottom: "6px" }}>
                      No Front (AP) Radiograph Uploaded
                    </h4>
                    <p style={{ fontSize: "13px", maxWidth: "340px", margin: "0 auto 16px" }}>
                      Upload a knee X-ray in Knee Analysis to view anatomical measurements and joint clearance.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate("/knee-analysis")}
                    >
                      Go to Knee Analysis
                    </button>
                  </>
                ) : (
                  <>
                    <Info size={32} style={{ margin: "0 auto 10px", opacity: 0.6 }} />
                    <h4 style={{ color: "var(--text-main)", fontSize: "15px", marginBottom: "6px" }}>
                      {viewOrientation === "side"
                        ? "Not available — lateral image not uploaded."
                        : "Not available — axial image not uploaded."}
                    </h4>
                    <p style={{ fontSize: "12px", maxWidth: "340px", margin: "0 auto 14px" }}>
                      {viewOrientation === "side"
                        ? "Upload a lateral radiograph in Knee Analysis to calculate Femoral AP and Tibial AP dimensions."
                        : "Upload an axial projection in Knee Analysis for patellofemoral articulation view."}
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate("/knee-analysis")}
                    >
                      Upload in Knee Analysis
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Requirement 9: Viewer tabs: FRONT VIEW (AP), SIDE VIEW, TOP VIEW */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: "4px",
                background: "rgba(15, 23, 42, 0.85)",
                backdropFilter: "blur(6px)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                zIndex: 10,
              }}
            >
              {(
                [
                  { id: "front", label: "FRONT VIEW (AP)" },
                  { id: "side", label: "SIDE VIEW (LATERAL)" },
                  { id: "top", label: "TOP VIEW (AXIAL)" },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setViewOrientation(v.id as AnatomicalOrientation)}
                  style={{
                    border: "none",
                    background: viewOrientation === v.id ? "var(--primary)" : "transparent",
                    color: "#fff",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "5px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Image-Derived Measurements Panel (Non-hardcoded) */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Database size={16} color="var(--primary)" />
              <span>Image-Derived Measurements</span>
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: derived?.isCalibrated ? "#22c55e" : "#eab308",
              }}
            >
              {derived?.isCalibrated ? "Calibrated (mm)" : "Pixel Units (px)"}
            </span>
          </div>

          {/* Genuine Derived Metrics List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Femoral Width</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Distal condyle span (Front AP)</div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                {derived?.femoralWidthMLText || "—"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Tibial Width</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Proximal tibial plateau span (Front AP)</div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                {derived?.tibialPlateauWidthText || "—"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Medial JSW</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Medial compartment clearance</div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#22c55e" }}>
                {derived?.medialJSWText || "—"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Lateral JSW</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Lateral compartment clearance</div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#22c55e" }}>
                {derived?.lateralJSWText || "—"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Minimum JSW (Focal)</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Narrowest point across joint</div>
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#eab308" }}>
                {derived?.jswMinText || "—"}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Femoral AP</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Anteroposterior femoral depth</div>
              </div>
              <div
                style={{
                  fontSize: derived?.femoralAP ? "15px" : "12px",
                  fontWeight: derived?.femoralAP ? 700 : 500,
                  color: derived?.femoralAP ? "#a855f7" : "var(--text-muted)",
                }}
              >
                {derived?.femoralAPText || "Not measurable — lateral radiograph required."}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Tibial AP</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Anteroposterior tibial depth</div>
              </div>
              <div
                style={{
                  fontSize: derived?.tibialAP ? "15px" : "12px",
                  fontWeight: derived?.tibialAP ? 700 : 500,
                  color: derived?.tibialAP ? "#a855f7" : "var(--text-muted)",
                }}
              >
                {derived?.tibialAPText || "Not measurable — lateral radiograph required."}
              </div>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px", fontSize: "13px" }}
              onClick={() => {
                const activeCaseId = currentView?.analysisResult?.case_id || safeViews.front?.analysisResult?.case_id;
                navigate(activeCaseId ? `/anatomical-measurements/${activeCaseId}` : "/anatomical-measurements");
              }}
            >
              <span>View Full Measurements Report</span>
              <ArrowRight size={14} />
            </button>
            <button
              className="btn btn-secondary"
              style={{ width: "100%", justifyContent: "space-between", padding: "8px 14px", fontSize: "12px" }}
              onClick={() => navigate("/implant-planning")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} color="var(--primary)" /> Implant Planning
              </span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Longitudinal Health Trend Analysis */}
      <InteractiveTrendChart />
    </div>
  );
};