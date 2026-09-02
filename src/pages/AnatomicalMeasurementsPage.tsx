import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Ruler,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Layers,
  UploadCloud,
  Database,
  Info,
  Sparkles,
  Download,
  RefreshCw,
  User,
} from "lucide-react";
import { useAnalysisStore, AnatomicalOrientation } from "../store/analysisStore";
import { scanApi } from "../lib/api";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

export const AnatomicalMeasurementsPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId: paramCaseId } = useParams<{ caseId?: string }>();
  const [viewTab, setViewTab] = useState<"measurements" | "segmentation" | "enhanced" | "original">("measurements");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<any | null>(null);

  const store = useAnalysisStore();
  const {
    orientation,
    views,
    setOrientation,
    setUploadedFile,
    runAnalysis,
    getDerivedMeasurements,
    patientInfo,
    setScanResult,
  } = store;

  // Resolve active case ID strictly from URL params or active store case
  const effectiveCaseId =
    paramCaseId ||
    store.activeCase?.caseId ||
    store.caseId ||
    views?.front?.analysisResult?.case_id ||
    views?.side?.analysisResult?.case_id ||
    null;

  // Load case by ID from backend if needed
  const loadCaseById = useCallback(async (idToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await scanApi.getCase(idToFetch);
      if (data && (data.case_id || data.measurements)) {
        setCaseData(data);
        if (typeof setScanResult === "function") {
          setScanResult(data);
        }
        localStorage.setItem("orthinx_active_case_id", data.case_id || idToFetch);
      } else {
        setError(`Case data for '${idToFetch}' does not contain valid measurements.`);
      }
    } catch (err: any) {
      console.error("[AnatomicalMeasurements] Failed to fetch case:", err);
      setError(
        err?.message || "Unable to load analysis results. Please verify the backend service is running."
      );
    } finally {
      setLoading(false);
    }
  }, [setScanResult]);

  // Initial load and sync on mount or param change
  useEffect(() => {
    if (paramCaseId) {
      // Direct URL parameter passed: load this specific case
      if (!caseData || caseData.case_id !== paramCaseId) {
        loadCaseById(paramCaseId);
      }
    } else if (effectiveCaseId && !views?.front?.analysisResult && !views?.side?.analysisResult && !caseData) {
      // Page refreshed with no in-memory store: restore from effective case ID
      loadCaseById(effectiveCaseId);
    } else if (store.caseId) {
      localStorage.setItem("orthinx_active_case_id", store.caseId);
    }
  }, [paramCaseId, effectiveCaseId, loadCaseById, views, caseData, store.caseId]);

  // Safe reference to active currentView and activeResult
  const safeViews = views || {
    front: { file: null, filePreviewUrl: null, fileName: null, fileSize: null, dimensions: null, enhancedPreviewUrl: null, isEnhancing: false, enhancementApplied: false, enhancementError: null, isAnalyzing: false, analysisStatus: "idle" as const, analysisResult: null, analysisError: null },
    side: { file: null, filePreviewUrl: null, fileName: null, fileSize: null, dimensions: null, enhancedPreviewUrl: null, isEnhancing: false, enhancementApplied: false, enhancementError: null, isAnalyzing: false, analysisStatus: "idle" as const, analysisResult: null, analysisError: null },
    top: { file: null, filePreviewUrl: null, fileName: null, fileSize: null, dimensions: null, enhancedPreviewUrl: null, isEnhancing: false, enhancementApplied: false, enhancementError: null, isAnalyzing: false, analysisStatus: "idle" as const, analysisResult: null, analysisError: null },
  };

  const safeOrientation = orientation && safeViews[orientation] ? orientation : "front";
  const currentView = safeViews[safeOrientation];

  const activeResult =
    currentView?.analysisResult ||
    caseData ||
    safeViews.front?.analysisResult ||
    safeViews.side?.analysisResult ||
    store.analysisResult ||
    null;

  const derived = getDerivedMeasurements();

  // Patient metadata resolution
  const patName = activeResult?.patient_name || patientInfo?.patientName || "Unassigned Patient";
  const patId = activeResult?.patient_code || activeResult?.patient_id || patientInfo?.patientId || (effectiveCaseId ? `PT-${effectiveCaseId.replace("case_", "").slice(0, 8).toUpperCase()}` : "PT-RECORD");
  const patAge = activeResult?.patient_age || patientInfo?.patientAge || 58;
  const patSex = activeResult?.patient_sex || patientInfo?.patientSex || "Female";
  const docName = activeResult?.doctor_name || patientInfo?.doctorName || "Dr. Alex Morgan, MD";
  const docSpec = activeResult?.doctor_specialization || patientInfo?.doctorSpecialization || "Chief Orthopedic Surgeon";
  const studyDate = activeResult?.formatted_date || patientInfo?.studyDate || (activeResult?.timestamp ? new Date(activeResult.timestamp).toLocaleString() : new Date().toLocaleString());

  // Calibration status
  const isCalibrated = Boolean(
    derived?.isCalibrated ||
    (activeResult?.calibration?.available && activeResult?.calibration?.unit === "mm")
  );
  const unit = derived?.unit ?? (isCalibrated ? "mm" : "px");
  const pixelSpacingDisplay =
    derived?.pixelSpacing ||
    activeResult?.calibration?.pixel_spacing_mm_px ||
    activeResult?.pixel_spacing ||
    "0.154";

  // Tab image URL computation
  const getActiveTabUrl = () => {
    if (!activeResult && !currentView) return "";

    const imgObj = activeResult?.image || {};
    const segObj = activeResult?.segmentation || {};
    const origFallback = currentView?.filePreviewUrl || imgObj.original || "";
    const enhFallback = currentView?.enhancedPreviewUrl || imgObj.enhanced || segObj.enhanced_url || origFallback;
    const measFallback = imgObj.measurements || segObj.measurements_url || imgObj.overlay || segObj.overlay_url || origFallback;
    const segFallback = imgObj.segmentation || segObj.mask_url || origFallback;

    switch (viewTab) {
      case "measurements":
        return measFallback || origFallback;
      case "segmentation":
        return segFallback || origFallback;
      case "enhanced":
        return enhFallback || origFallback;
      case "original":
      default:
        return imgObj.original || origFallback;
    }
  };

  const currentTabUrl = getActiveTabUrl();

  // 1. Loading State
  if (loading) {
    return (
      <div style={{ maxWidth: "800px", margin: "80px auto", textAlign: "center" }}>
        <div className="card" style={{ padding: "60px 40px" }}>
          <RefreshCw
            size={42}
            style={{
              margin: "0 auto 16px",
              color: "var(--primary)",
              animation: "spin 1.5s linear infinite",
            }}
          />
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            Loading anatomical measurements...
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            Retrieving image-derived anatomical measurements and JSW clearances for Case: {effectiveCaseId || "..."}
          </p>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div style={{ maxWidth: "800px", margin: "80px auto", textAlign: "center" }}>
        <div
          className="card"
          style={{
            padding: "48px 36px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            background: "var(--bg-card)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#ef4444",
            }}
          >
            <AlertTriangle size={28} />
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            Unable to load analysis results
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
            {error}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            {effectiveCaseId && (
              <button
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                onClick={() => loadCaseById(effectiveCaseId)}
              >
                <RefreshCw size={14} /> Retry
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              onClick={() => navigate("/knee-analysis")}
            >
              <ArrowLeft size={14} /> Back to Knee Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State (No analysis data exists)
  const hasAnyData = Boolean(
    activeResult ||
    safeViews.front?.filePreviewUrl ||
    safeViews.side?.filePreviewUrl ||
    safeViews.top?.filePreviewUrl ||
    derived
  );

  if (!hasAnyData) {
    return (
      <div style={{ maxWidth: "800px", margin: "80px auto", textAlign: "center" }}>
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
            <Ruler size={32} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            No active knee analysis
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto 20px" }}>
            Upload a new X-ray to begin.
          </p>
          <button
            className="btn btn-primary"
            style={{ padding: "10px 24px", display: "inline-flex", alignItems: "center", gap: "8px" }}
            onClick={() => navigate("/knee-analysis")}
          >
            <UploadCloud size={16} /> Go to Knee Analysis
          </button>
        </div>
      </div>
    );
  }

  // 4. Data-Derived Values
  const rawMeasurements = activeResult?.measurements || {};
  const femoralWidthMLText =
    derived?.femoralWidthMLText ||
    (rawMeasurements?.femoral_width?.value !== undefined
      ? `${rawMeasurements.femoral_width.value} ${rawMeasurements.femoral_width.unit || unit}`
      : "—");

  const tibialPlateauWidthText =
    derived?.tibialPlateauWidthText ||
    (rawMeasurements?.tibial_width?.value !== undefined
      ? `${rawMeasurements.tibial_width.value} ${rawMeasurements.tibial_width.unit || unit}`
      : "—");

  const femoralAPText =
    derived?.femoralAPText ||
    (rawMeasurements?.femoral_ap?.value !== null && rawMeasurements?.femoral_ap?.value !== undefined
      ? `${rawMeasurements.femoral_ap.value} ${rawMeasurements.femoral_ap.unit || unit}`
      : rawMeasurements?.femoral_ap?.status || "Requires lateral radiograph");

  const tibialAPText =
    derived?.tibialAPText ||
    (rawMeasurements?.tibial_ap?.value !== null && rawMeasurements?.tibial_ap?.value !== undefined
      ? `${rawMeasurements.tibial_ap.value} ${rawMeasurements.tibial_ap.unit || unit}`
      : rawMeasurements?.tibial_ap?.status || "Requires lateral radiograph");

  const medialJSWText =
    derived?.medialJSWText ||
    (rawMeasurements?.medial_jsw?.value !== undefined
      ? `${rawMeasurements.medial_jsw.value} ${rawMeasurements.medial_jsw.unit || unit}`
      : "—");

  const lateralJSWText =
    derived?.lateralJSWText ||
    (rawMeasurements?.lateral_jsw?.value !== undefined
      ? `${rawMeasurements.lateral_jsw.value} ${rawMeasurements.lateral_jsw.unit || unit}`
      : "—");

  const minJSWText =
    derived?.jswMinText ||
    (rawMeasurements?.min_jsw?.value !== undefined
      ? `${rawMeasurements.min_jsw.value} ${rawMeasurements.min_jsw.unit || unit}`
      : "—");

  const jointAreaText =
    derived?.jointAreaText ||
    (rawMeasurements?.joint_space_area?.value !== undefined
      ? `${rawMeasurements.joint_space_area.value} ${rawMeasurements.joint_space_area.unit || (isCalibrated ? "mm²" : "px²")}`
      : "—");

  const caseIdDisplay = activeResult?.case_id || effectiveCaseId || "Active Scan";

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "50px" }}>
        {/* Top Header & Navigation Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "16px",
            marginBottom: "20px",
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
              Case: {caseIdDisplay}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => navigate("/meniscus-analysis")}
            >
              <Layers size={14} />
              <span>Meniscus Analysis</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => navigate("/implant-planning")}
            >
              <Sparkles size={14} />
              <span>Implant Planning</span>
              <ArrowRight size={14} />
            </button>

            <button
              className="btn btn-outline btn-sm"
              style={{
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--primary)",
                borderColor: "var(--primary)",
              }}
              onClick={async () => {
                if (activeResult?.case_id || effectiveCaseId) {
                  await scanApi.downloadCasePdf(activeResult?.case_id || effectiveCaseId);
                } else {
                  navigate("/reports");
                }
              }}
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Patient Demographic Summary Card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "14px 18px",
            marginBottom: "20px",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Patient Name</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>{patName}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Patient ID</div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>{patId}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Age / Sex</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>{patAge} yrs / {patSex}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Attending Specialist</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>{docName}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Analysis Date & Time</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>{studyDate}</div>
          </div>
        </div>

        {/* Page Title */}
        <div className="page-header" style={{ marginBottom: "16px" }}>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <Ruler size={24} color="var(--primary)" />
            <span>Image-Derived Measurements</span>
          </h1>
          <p className="page-subtitle" style={{ margin: "4px 0 0" }}>
            Quantitative anatomical dimensions and articular joint clearances derived from actual uploaded knee radiographs.
          </p>
        </div>

        {/* Calibration Status Banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isCalibrated ? "rgba(34, 197, 94, 0.1)" : "rgba(234, 179, 8, 0.1)",
            border: isCalibrated ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(234, 179, 8, 0.3)",
            color: isCalibrated ? "#22c55e" : "#eab308",
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isCalibrated ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
            <span>
              {isCalibrated ? (
                <>
                  <strong>User Calibrated Mode (mm):</strong> Physical scale is calibrated at{" "}
                  <strong>{pixelSpacingDisplay} mm/px</strong>.
                </>
              ) : (
                <>
                  <strong>Physical scale unavailable — measurements shown in pixels (px).</strong> No unverified millimeter conversion applied.
                </>
              )}
            </span>
          </div>

          <span style={{ fontWeight: 700, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
            {isCalibrated ? "User Calibrated" : "Pixel units only"}
          </span>
        </div>

        {/* Main Grid: Left = X-Ray Viewport, Right = Measurements */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", alignItems: "start" }}>
          {/* Left Column: Image Viewport */}
          <div className="card" style={{ padding: "18px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {/* View Tab Switcher */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  background: "var(--bg-card)",
                  padding: "4px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                }}
              >
                {(
                  [
                    { id: "measurements", label: "Measurements" },
                    { id: "segmentation", label: "Segmentation" },
                    { id: "enhanced", label: "Enhanced" },
                    { id: "original", label: "Original" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewTab(tab.id)}
                    style={{
                      border: "none",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: viewTab === tab.id ? 700 : 500,
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: viewTab === tab.id ? "var(--primary)" : "transparent",
                      color: viewTab === tab.id ? "#ffffff" : "var(--text-muted)",
                      boxShadow: viewTab === tab.id ? "0 2px 8px rgba(168, 85, 247, 0.4)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Projection Selector */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  background: "var(--bg-card)",
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
                ).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setOrientation(v.id as AnatomicalOrientation)}
                    style={{
                      border: "none",
                      padding: "5px 10px",
                      fontSize: "11px",
                      fontWeight: safeOrientation === v.id ? 700 : 500,
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: safeOrientation === v.id ? "var(--primary)" : "transparent",
                      color: safeOrientation === v.id ? "#ffffff" : "var(--text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport Box */}
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: "420px",
                maxHeight: "520px",
                borderRadius: "8px",
                overflow: "hidden",
                background: "#080c14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border)",
              }}
            >
              {currentTabUrl || currentView?.filePreviewUrl ? (
                <img
                  src={currentTabUrl || currentView?.filePreviewUrl}
                  alt={`${safeOrientation} Measurements View`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "520px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                  <Info size={32} style={{ margin: "0 auto 10px", opacity: 0.6 }} />
                  <h4 style={{ color: "var(--text-main)", fontSize: "15px", marginBottom: "6px" }}>
                    {safeOrientation === "side"
                      ? "Requires lateral radiograph"
                      : "Not available — axial image not uploaded"}
                  </h4>
                  <p style={{ fontSize: "12px", maxWidth: "340px", margin: "0 auto 16px" }}>
                    {safeOrientation === "side"
                      ? "Upload the lateral radiograph to calculate Femoral AP and Tibial AP dimensions."
                      : "Upload the axial radiograph for patellofemoral articulation assessment."}
                  </p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const input = document.getElementById("anatomical-meas-file-input");
                      input?.click();
                    }}
                  >
                    <UploadCloud size={14} /> Upload {safeOrientation.toUpperCase()} Radiograph
                  </button>
                  <input
                    id="anatomical-meas-file-input"
                    type="file"
                    accept="image/*,.dcm"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadedFile(e.target.files[0], safeOrientation);
                        await runAnalysis(safeOrientation);
                      }
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  background: "rgba(0,0,0,0.75)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#fff",
                  fontWeight: 600,
                  backdropFilter: "blur(4px)",
                }}
              >
                PROJECTION: {safeOrientation.toUpperCase()} • {viewTab.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Right Column: Quantitative Image-Derived Measurements */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Bone Dimensions Card */}
            <div className="card">
              <h2
                className="card-title"
                style={{
                  fontSize: "16px",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Database size={16} color="var(--primary)" />
                <span>Femoral & Tibial Bone Geometry</span>
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Femoral Width (Condylar Span)
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Medial-lateral distance between condyles (Front AP)
                    </div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                    {femoralWidthMLText}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Tibial Plateau Width
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Proximal tibial articulation plateau (Front AP)
                    </div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                    {tibialPlateauWidthText}
                  </div>
                </div>

                {/* Femoral AP from actual lateral radiograph or projection-aware status */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Femoral AP Dimension
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Anteroposterior femoral depth (Lateral radiograph)
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: femoralAPText.includes("Requires") ? "12px" : "16px",
                      fontWeight: femoralAPText.includes("Requires") ? 500 : 700,
                      color: femoralAPText.includes("Requires") ? "var(--text-muted)" : "#a855f7",
                    }}
                  >
                    {femoralAPText}
                  </div>
                </div>

                {/* Tibial AP from actual lateral radiograph or projection-aware status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Tibial AP Dimension
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Anteroposterior tibial depth (Lateral radiograph)
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: tibialAPText.includes("Requires") ? "12px" : "16px",
                      fontWeight: tibialAPText.includes("Requires") ? 500 : 700,
                      color: tibialAPText.includes("Requires") ? "var(--text-muted)" : "#a855f7",
                    }}
                  >
                    {tibialAPText}
                  </div>
                </div>
              </div>
            </div>

            {/* Joint Space Measurements Card */}
            <div className="card">
              <h2
                className="card-title"
                style={{
                  fontSize: "16px",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Ruler size={16} color="var(--primary)" />
                <span>Joint Space Width (JSW) Clearances</span>
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Medial Joint Space Width
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Medial load-bearing clearance
                    </div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#22c55e" }}>
                    {medialJSWText}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Lateral Joint Space Width
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Lateral compartment clearance
                    </div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#22c55e" }}>
                    {lateralJSWText}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Minimum Joint Space Width (Focal)
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Narrowest point across articulation
                    </div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#eab308" }}>
                    {minJSWText}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      Total Articular Clearance Area
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      Segmented radiolucent joint space mass
                    </div>
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                    {jointAreaText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};