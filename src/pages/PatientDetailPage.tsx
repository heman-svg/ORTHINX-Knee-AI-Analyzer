import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Download,
  FileText,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
  Ruler,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Plus,
  Sparkles,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { scanApi, patientApi } from "../lib/api";
import { useAnalysisStore } from "../store/analysisStore";

export const PatientDetailPage: React.FC = () => {
  const { id, patientId } = useParams<{ id?: string; patientId?: string }>();
  const effectiveId = patientId || id;
  const navigate = useNavigate();
  const store = useAnalysisStore();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [patientInfo, setPatientInfo] = useState<{
    id: string;
    patientCode: string;
    name: string;
    age: number;
    sex: string;
    doctorName?: string;
    doctorSpecialization?: string;
  } | null>(null);

  const [cases, setCases] = useState<any[]>([]);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"measurements" | "segmentation" | "enhanced" | "original">("measurements");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchPatientAndCases = async () => {
      if (!effectiveId) return;
      setLoading(true);
      setErrorMessage(null);

      try {
        // 1. Fetch all cases
        let allCases: any[] = [];
        try {
          allCases = await scanApi.listAllCases();
        } catch (e) {
          console.warn("Could not list all cases:", e);
        }

        // 2. Fetch patient from backend if possible
        let backendPat: any = null;
        try {
          const numId = parseInt(effectiveId, 10);
          if (!isNaN(numId)) {
            backendPat = await patientApi.get(numId);
          }
        } catch {
          // fallback
        }

        // 3. Filter cases for this patient
        const matchingCases = Array.isArray(allCases)
          ? allCases.filter(
              (c: any) =>
                c.case_id === effectiveId ||
                c.patient_code === effectiveId ||
                c.patient_id === effectiveId ||
                String(c.patient_id) === effectiveId
            )
          : [];

        // 4. Check if current active store matches
        if (matchingCases.length === 0 && store.activeCase?.analysisResult) {
          const activeRes = store.activeCase.analysisResult;
          if (
            activeRes.case_id === effectiveId ||
            store.patientInfo.patientId === effectiveId
          ) {
            matchingCases.push(activeRes);
          }
        }

        // Determine patient info
        let patCode = effectiveId;
        let patName = `Patient ${effectiveId}`;
        let patAge = 0;
        let patSex = "Unknown";
        let docName = "Dr. Alex Morgan, MD";
        let docSpec = "Musculoskeletal Orthopedics";

        if (backendPat) {
          patCode = backendPat.patient_code || String(backendPat.id);
          patName = backendPat.name || patName;
          patAge = backendPat.age || 0;
          patSex = backendPat.sex === "M" || backendPat.sex === "m" ? "Male" : backendPat.sex === "F" || backendPat.sex === "f" ? "Female" : "Other";
        } else if (matchingCases.length > 0) {
          const first = matchingCases[0];
          patCode = first.patient_code || first.patient_id || effectiveId;
          patName = first.patient_name || store.patientInfo.patientName || patName;
          patAge = first.patient_age || store.patientInfo.patientAge || 0;
          patSex = first.patient_sex || store.patientInfo.patientSex || patSex;
          if (first.doctor_name) docName = first.doctor_name;
          if (first.doctor_specialization) docSpec = first.doctor_specialization;
        } else if (store.patientInfo.patientId === effectiveId) {
          patCode = store.patientInfo.patientId;
          patName = store.patientInfo.patientName || patName;
          patAge = store.patientInfo.patientAge || 0;
          patSex = store.patientInfo.patientSex || patSex;
        }

        setPatientInfo({
          id: String(backendPat?.id || effectiveId),
          patientCode: patCode,
          name: patName,
          age: patAge,
          sex: patSex,
          doctorName: docName,
          doctorSpecialization: docSpec,
        });

        setCases(matchingCases);
        if (matchingCases.length > 0) {
          setSelectedCase(matchingCases[0]);
        }
      } catch (err: any) {
        console.error("Error fetching patient details:", err);
        setErrorMessage(err?.message || "Unable to load patient data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientAndCases();
  }, [effectiveId, store.activeCase, store.patientInfo]);

  const handleStartNewAnalysis = () => {
    store.startNewAnalysis();
    if (patientInfo) {
      store.setPatientInfo({
        patientId: patientInfo.patientCode,
        patientName: patientInfo.name,
        patientAge: patientInfo.age,
        patientSex: patientInfo.sex,
      });
    }
    navigate("/analysis/upload");
  };

  const handleLoadCaseIntoAnalysis = (c: any) => {
    store.setScanResult(c, (c.view as any) || "front");
    if (patientInfo) {
      store.setPatientInfo({
        patientId: patientInfo.patientCode,
        patientName: patientInfo.name,
        patientAge: patientInfo.age,
        patientSex: patientInfo.sex,
      });
    }
    navigate("/analysis/results");
  };

  const handleDownloadPdf = async (targetCase: any) => {
    if (!targetCase) return;
    setDownloading(true);
    try {
      const patCode = patientInfo?.patientCode || "Patient";
      const filename = `ORTHINX_Report_${patCode}_${targetCase.case_id || "Case"}.pdf`;
      if (targetCase.case_id) {
        await scanApi.downloadCasePdf(targetCase.case_id, filename);
      } else {
        await scanApi.generatePdfFromPayload(targetCase, filename);
      }
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF report. Ensure backend service is reachable.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "1200px", margin: "60px auto", textAlign: "center" }}>
        <div className="card" style={{ padding: "60px 40px" }}>
          <RefreshCw
            size={36}
            className="spin"
            style={{ margin: "0 auto 16px", color: "var(--primary)" }}
          />
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
            Loading Patient Record...
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            Querying clinical archives for ID: {effectiveId}
          </p>
        </div>
      </div>
    );
  }

  if (errorMessage || !patientInfo) {
    return (
      <div style={{ maxWidth: "1200px", margin: "60px auto" }}>
        <div className="card" style={{ padding: "48px 36px", textAlign: "center", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
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
            <AlertCircle size={28} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            Unable to Load Patient Data
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 24px" }}>
            {errorMessage || `No clinical records found for Patient ID: '${effectiveId}'.`}
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/patients")}>
              <ArrowLeft size={14} /> Back to Patient Directory
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/analysis/upload")}>
              Analyze New Radiograph
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Selected case derived data
  const m = selectedCase?.measurements || {};
  const isCalibrated = Boolean(selectedCase?.calibration?.available && selectedCase?.calibration?.unit === "mm");
  const unit = isCalibrated ? "mm" : "px";

  const femW = m.femoral_width?.value !== undefined && m.femoral_width?.value !== null ? `${m.femoral_width.value} ${m.femoral_width.unit || unit}` : "Not measurable on this view";
  const femAP = m.femoral_ap?.value !== undefined && m.femoral_ap?.value !== null ? `${m.femoral_ap.value} ${m.femoral_ap.unit || unit}` : "Requires lateral radiograph";
  const tibW = m.tibial_width?.value !== undefined && m.tibial_width?.value !== null ? `${m.tibial_width.value} ${m.tibial_width.unit || unit}` : "Not measurable on this view";
  const tibAP = m.tibial_ap?.value !== undefined && m.tibial_ap?.value !== null ? `${m.tibial_ap.value} ${m.tibial_ap.unit || unit}` : "Requires lateral radiograph";
  const medJSW = m.medial_jsw?.value !== undefined && m.medial_jsw?.value !== null ? `${m.medial_jsw.value} ${m.medial_jsw.unit || unit}` : "Not measurable on this view";
  const latJSW = m.lateral_jsw?.value !== undefined && m.lateral_jsw?.value !== null ? `${m.lateral_jsw.value} ${m.lateral_jsw.unit || unit}` : "Not measurable on this view";
  const minJSW = m.min_jsw?.value !== undefined && m.min_jsw?.value !== null ? `${m.min_jsw.value} ${m.min_jsw.unit || unit}` : "Not measurable on this view";

  const origImg = selectedCase?.image?.original || selectedCase?.original_image_url || "";
  const enhImg = selectedCase?.image?.enhanced || selectedCase?.segmentation?.enhanced_url || origImg;
  const measImg = selectedCase?.image?.measurements || selectedCase?.image?.overlay || selectedCase?.segmentation?.measurements_url || origImg;
  const maskImg = selectedCase?.image?.segmentation || selectedCase?.segmentation?.mask_url || origImg;

  const currentTabUrl =
    activeTab === "original"
      ? origImg
      : activeTab === "enhanced"
      ? enhImg
      : activeTab === "measurements"
      ? measImg
      : maskImg;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "8px 0" }}>
      {/* Top Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/patients")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={15} /> Back to Patient Directory
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <AnimatedButton
            variant="primary"
            icon={<Plus size={15} />}
            onClick={handleStartNewAnalysis}
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            Start New Analysis
          </AnimatedButton>
        </div>
      </div>

      {/* Patient Header Card */}
      <div className="card" style={{ padding: "24px", marginBottom: "24px", border: "1px solid var(--border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--primary)", letterSpacing: "1.5px" }}>
              PATIENT CLINICAL RECORD
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
              {patientInfo.name}
            </h1>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
              Patient ID: <b style={{ color: "var(--primary)" }}>{patientInfo.patientCode}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                background: "rgba(124, 58, 237, 0.15)",
                color: "var(--primary)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
              }}
            >
              <Activity size={13} /> {cases.length} Total {cases.length === 1 ? "Study" : "Studies"}
            </span>
          </div>
        </div>

        {/* Patient Demographics Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "20px",
            paddingTop: "16px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Age & Sex</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
              {patientInfo.age > 0 ? `${patientInfo.age} yrs` : "—"} / {patientInfo.sex}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Attending Specialist</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
              {patientInfo.doctorName || "Dr. Alex Morgan, MD"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {patientInfo.doctorSpecialization || "Musculoskeletal Orthopedics"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Primary Indication</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
              Knee Radiograph Morphometry
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Case History Status</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: cases.length > 0 ? "#22c55e" : "var(--text-muted)", marginTop: "2px" }}>
              {cases.length > 0 ? `${cases.length} Completed Analysis` : "No Radiographs Analyzed"}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis History Section */}
      <div className="card" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="card-title" style={{ fontSize: "16px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={17} color="var(--primary)" />
            <span>Analysis History ({cases.length})</span>
          </h2>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Select a case to view radiograph and derived measurements
          </span>
        </div>

        {cases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "var(--bg-app)", borderRadius: "8px", border: "1px dashed var(--border)" }}>
            <FileText size={36} color="var(--text-muted)" style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 16px" }}>
              No analysis cases recorded for this patient yet.
            </p>
            <AnimatedButton variant="primary" icon={<Plus size={14} />} onClick={handleStartNewAnalysis}>
              Upload & Analyze X-Ray
            </AnimatedButton>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Study Date / Time</th>
                  <th>View</th>
                  <th>AI Severity Grade</th>
                  <th>Analysis Status</th>
                  <th>Report Availability</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const isSelected = selectedCase?.case_id === c.case_id;
                  const dateStr = c.formatted_date || (c.timestamp ? new Date(c.timestamp).toLocaleString() : "—");
                  return (
                    <tr
                      key={c.case_id}
                      style={{
                        background: isSelected ? "rgba(124, 58, 237, 0.08)" : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedCase(c)}
                    >
                      <td style={{ fontWeight: 700, color: "var(--primary)", fontSize: "13px" }}>
                        {c.case_id}
                      </td>
                      <td style={{ fontSize: "13px" }}>{dateStr}</td>
                      <td style={{ fontSize: "13px", fontWeight: 600 }}>{String(c.view || "front").toUpperCase()}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background: "rgba(91, 75, 255, 0.12)",
                            color: "var(--primary)",
                            border: "1px solid rgba(91, 75, 255, 0.25)",
                          }}
                        >
                          <Sparkles size={11} />
                          {c.classification?.class_name || "Mild"}
                          {c.classification?.confidence ? ` (${(c.classification.confidence * 100).toFixed(0)}%)` : ""}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={11} /> {c.analysis?.status || "SUCCESS"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          PDF Ready
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            onClick={() => handleLoadCaseIntoAnalysis(c)}
                            title="Open in Analysis Results view"
                          >
                            <ExternalLink size={12} /> View Analysis
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: "4px 10px", fontSize: "12px" }}
                            onClick={() => handleDownloadPdf(c)}
                            disabled={downloading}
                            title="Download PDF report for this case"
                          >
                            <Download size={12} /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Historical Case Detail (Patient / Case Separation) */}
      {selectedCase && (
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", alignItems: "start" }}>
          {/* Left Column: Image Viewport */}
          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                Radiograph Artifacts: {selectedCase.case_id}
              </h3>
              <span className="badge badge-info" style={{ fontSize: "11px" }}>
                {String(selectedCase.view || "front").toUpperCase()} Projection
              </span>
            </div>

            {/* Image View Selector Tabs */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: "var(--bg-app)",
                padding: "4px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                marginBottom: "14px",
              }}
            >
              {(
                [
                  { id: "measurements", label: "Measurements" },
                  { id: "segmentation", label: "Segmentation Mask" },
                  { id: "enhanced", label: "Enhanced" },
                  { id: "original", label: "Original" },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      border: "none",
                      padding: "8px 10px",
                      fontSize: "12px",
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isActive ? "var(--primary)" : "transparent",
                      color: isActive ? "#ffffff" : "var(--text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Viewport Frame */}
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: "380px",
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
              {currentTabUrl ? (
                <img
                  src={currentTabUrl}
                  alt={`Case ${selectedCase.case_id} ${activeTab}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "500px",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                  <FileText size={36} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: "13px" }}>Image not available for this tab view</p>
                </div>
              )}

              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  left: "12px",
                  background: "rgba(0,0,0,0.75)",
                  color: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {activeTab} VIEW
              </div>
            </div>
          </div>

          {/* Right Column: Measurements & Assessment */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Morphometric Measurements Table */}
            <div className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 className="card-title" style={{ fontSize: "15px", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Ruler size={17} color="var(--primary)" />
                  <span>Quantitative Anatomical Metrics</span>
                </h3>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    background: isCalibrated ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                    color: isCalibrated ? "#22c55e" : "#eab308",
                  }}
                >
                  {isCalibrated ? "Calibrated (mm)" : "Pixel Scale (px)"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Femoral Width</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Mediolateral distal condylar span</div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>{femW}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Femoral AP</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Condylar depth dimension</div>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: femAP.includes("lateral") ? "var(--warning)" : "var(--text-main)" }}>
                    {femAP}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Tibial Width</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Proximal tibial plateau span</div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>{tibW}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Tibial AP</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Plateau depth dimension</div>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: tibAP.includes("lateral") ? "var(--warning)" : "var(--text-main)" }}>
                    {tibAP}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Medial JSW</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Medial compartment clearance</div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--primary)" }}>{medJSW}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "8px", borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Lateral JSW</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Lateral compartment clearance</div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--primary)" }}>{latJSW}</div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Minimum JSW</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Focal narrowest clearance point</div>
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "#eab308" }}>{minJSW}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px" }}>
                Case Actions
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleLoadCaseIntoAnalysis(selectedCase)}>
                  <ExternalLink size={14} /> Open Full Workflow
                </button>
                <AnimatedButton
                  variant="primary"
                  icon={<Download size={14} />}
                  onClick={() => handleDownloadPdf(selectedCase)}
                  disabled={downloading}
                >
                  {downloading ? "Generating PDF..." : "Download PDF Report"}
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
