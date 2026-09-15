import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CheckCircle2,
  Search,
  Activity,
  AlertCircle,
  Plus,
  RefreshCw,
  Ruler,
  Layers,
  ShieldCheck,
  User,
  ArrowRight,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { scanApi } from "../lib/api";
import { useAnalysisStore } from "../store/analysisStore";

export interface ClinicalReportSummary {
  id: string;
  caseId: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientSex: string;
  doctorName: string;
  doctorSpecialization: string;
  studyDate: string;
  view: string;
  status: string;
  qualityScore: number | null;
  qcStatus: string;
  originalImage?: string;
  enhancedImage?: string;
  measurementImage?: string;
  segmentationImage?: string;
  measurements: {
    femoralWidth: string;
    femoralAP: string;
    tibialWidth: string;
    tibialAP: string;
    medialJSW: string;
    lateralJSW: string;
    minJSW: string;
    isCalibrated: boolean;
    unit: string;
  };
  meniscusFindings: string;
  rawCase?: any;
}

const ROWS_PER_PAGE = 6;

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const store = useAnalysisStore();

  const [reports, setReports] = useState<ClinicalReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ClinicalReportSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"measurements" | "segmentation" | "enhanced" | "original">("measurements");
  const [activePage, setActivePage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Active case from analysisStore if available
  const activeCase = store.activeCase;
  const activeCaseResult = activeCase?.analysisResult;

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const cases = await scanApi.listAllCases();
      const mapped: ClinicalReportSummary[] = [];

      // Helper to map a raw case to ClinicalReportSummary
      const mapCaseToReport = (c: any): ClinicalReportSummary => {
        const caseId = c.case_id || "";
        const m = c.measurements || {};
        const isCalibrated = Boolean(c.calibration?.available && c.calibration?.unit === "mm");
        const unit = isCalibrated ? "mm" : "px";

        const patCode = c.patient_code || (c.patient_id ? String(c.patient_id) : `PT-${caseId.replace("case_", "").slice(0, 8).toUpperCase()}`);
        const patName = c.patient_name || store.patientInfo.patientName || `Patient ${patCode}`;
        const patAge = c.patient_age || store.patientInfo.patientAge || 0;
        const patSex = c.patient_sex || store.patientInfo.patientSex || "Unknown";
        const docName = c.doctor_name || store.patientInfo.doctorName || "Dr. Alex Morgan, MD";
        const docSpec = c.doctor_specialization || store.patientInfo.doctorSpecialization || "Musculoskeletal Orthopedics";
        const dateStr = c.formatted_date || (c.timestamp ? new Date(c.timestamp).toLocaleString() : new Date().toLocaleString());

        const femW = m.femoral_width?.value !== undefined && m.femoral_width?.value !== null ? `${m.femoral_width.value} ${m.femoral_width.unit || unit}` : "Not measurable on this view";
        const femAP = m.femoral_ap?.value !== undefined && m.femoral_ap?.value !== null ? `${m.femoral_ap.value} ${m.femoral_ap.unit || unit}` : "Requires lateral radiograph";
        const tibW = m.tibial_width?.value !== undefined && m.tibial_width?.value !== null ? `${m.tibial_width.value} ${m.tibial_width.unit || unit}` : "Not measurable on this view";
        const tibAP = m.tibial_ap?.value !== undefined && m.tibial_ap?.value !== null ? `${m.tibial_ap.value} ${m.tibial_ap.unit || unit}` : "Requires lateral radiograph";
        const medJSW = m.medial_jsw?.value !== undefined && m.medial_jsw?.value !== null ? `${m.medial_jsw.value} ${m.medial_jsw.unit || unit}` : "Not measurable on this view";
        const latJSW = m.lateral_jsw?.value !== undefined && m.lateral_jsw?.value !== null ? `${m.lateral_jsw.value} ${m.lateral_jsw.unit || unit}` : "Not measurable on this view";
        const minJSW = m.min_jsw?.value !== undefined && m.min_jsw?.value !== null ? `${m.min_jsw.value} ${m.min_jsw.unit || unit}` : "Not measurable on this view";

        const meniscusFindings = m.meniscus?.message || "Meniscus analysis is not available for this case.";

        return {
          id: `REP-${caseId.replace("case_", "").slice(0, 8).toUpperCase()}`,
          caseId,
          patientId: patCode,
          patientName: patName,
          patientAge: patAge,
          patientSex: patSex,
          doctorName: docName,
          doctorSpecialization: docSpec,
          studyDate: dateStr,
          view: String(c.view || "front").toUpperCase(),
          status: c.analysis?.status || "SUCCESS",
          qualityScore: c.analysis?.quality_score ?? c.quality_control?.quality_score ?? null,
          qcStatus: c.quality_control?.status || "PASSED",
          originalImage: c.image?.original || c.original_image_url || "",
          enhancedImage: c.image?.enhanced || c.segmentation?.enhanced_url || "",
          measurementImage: c.image?.measurements || c.image?.overlay || c.segmentation?.measurements_url || "",
          segmentationImage: c.image?.segmentation || c.segmentation?.mask_url || "",
          measurements: {
            femoralWidth: femW,
            femoralAP: femAP,
            tibialWidth: tibW,
            tibialAP: tibAP,
            medialJSW: medJSW,
            lateralJSW: latJSW,
            minJSW: minJSW,
            isCalibrated,
            unit,
          },
          meniscusFindings,
          rawCase: c,
        };
      };

      if (cases && Array.isArray(cases)) {
        cases.forEach((c) => {
          mapped.push(mapCaseToReport(c));
        });
      }

      // Include active case if not already in list
      if (activeCaseResult && activeCaseResult.case_id) {
        const exists = mapped.some((r) => r.caseId === activeCaseResult.case_id);
        if (!exists) {
          mapped.unshift(mapCaseToReport(activeCaseResult));
        }
      }

      setReports(mapped);

      // Default selected report to active case if available, else first
      if (activeCaseResult && activeCaseResult.case_id) {
        const found = mapped.find((r) => r.caseId === activeCaseResult.case_id);
        if (found) setSelectedReport(found);
      } else if (mapped.length > 0) {
        setSelectedReport(mapped[0]);
      }
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      setError("Unable to load reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeCaseResult?.case_id]);

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.patientName.toLowerCase().includes(q) ||
        r.patientId.toLowerCase().includes(q) ||
        r.caseId.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / ROWS_PER_PAGE));
  const safeActivePage = Math.min(activePage, totalPages);
  const pageReports = filteredReports.slice(
    (safeActivePage - 1) * ROWS_PER_PAGE,
    safeActivePage * ROWS_PER_PAGE
  );
  const startIdx = (safeActivePage - 1) * ROWS_PER_PAGE + 1;
  const endIdx = Math.min(safeActivePage * ROWS_PER_PAGE, filteredReports.length);

  const handleDownloadPdf = async (report: ClinicalReportSummary) => {
    try {
      setDownloadingId(report.id);
      const safePat = (report.patientId || "Patient").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `ORTHINX_Report_${safePat}_${report.caseId}.pdf`;
      if (report.caseId) {
        await scanApi.downloadCasePdf(report.caseId, filename);
      } else if (report.rawCase) {
        await scanApi.generatePdfFromPayload(report.rawCase, filename);
      }
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("PDF download failed. Ensure backend service is reachable.");
    } finally {
      setDownloadingId(null);
    }
  };

  const currentReportImage = useMemo(() => {
    if (!selectedReport) return "";
    if (activeTab === "original") return selectedReport.originalImage || "";
    if (activeTab === "enhanced") return selectedReport.enhancedImage || selectedReport.originalImage || "";
    if (activeTab === "measurements") return selectedReport.measurementImage || selectedReport.originalImage || "";
    return selectedReport.segmentationImage || selectedReport.originalImage || "";
  }, [selectedReport, activeTab]);

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "8px 0" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--primary)", letterSpacing: "1.5px" }}>
            ORTHINX · MUSCULOSKELETAL AI
          </div>
          <h1 className="page-title" style={{ marginTop: "4px" }}>
            AI-Assisted Knee Radiograph Analysis Report
          </h1>
          <p className="page-subtitle" style={{ marginTop: "2px" }}>
            Standardized clinical morphometric summary derived from digital radiographs
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchReports}
            title="Refresh reports"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <AnimatedButton
            variant="primary"
            icon={<Plus size={15} />}
            onClick={() => {
              store.startNewAnalysis();
              navigate("/analysis/upload");
            }}
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            New Analysis
          </AnimatedButton>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "70px 20px" }}>
          <RefreshCw size={32} className="spin" color="var(--primary)" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            Loading clinical reports...
          </p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 20px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <AlertCircle size={36} color="#ef4444" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
            {error}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "18px" }}>
            Ensure backend report service is reachable.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={fetchReports}>
            Retry
          </button>
        </div>
      ) : reports.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "80px 20px",
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
          }}
        >
          <FileText size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px", opacity: 0.4 }} />
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>
            No Clinical Reports Available
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 24px" }}>
            Reports are generated automatically from analyzed knee radiograph cases. Start an AI analysis on an uploaded X-ray to produce an official report.
          </p>
          <AnimatedButton
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/analysis/upload")}
            style={{ padding: "10px 22px" }}
          >
            Analyze Knee X-Ray
          </AnimatedButton>
        </div>
      ) : (
        /* Main Report Workspace */
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "24px", alignItems: "start" }}>
          {/* Left: Report Selector & Archives */}
          <div className="card" style={{ padding: "16px", border: "1px solid var(--border)" }}>
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
                Select Clinical Case ({reports.length})
              </div>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  color="var(--text-muted)"
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Filter cases..."
                  className="form-input"
                  style={{ paddingLeft: "32px", fontSize: "12px", height: "34px", width: "100%" }}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActivePage(1);
                  }}
                />
              </div>
            </div>

            {/* Case List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "560px", overflowY: "auto" }}>
              {pageReports.map((r) => {
                const isSelected = selectedReport?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                      background: isSelected ? "rgba(124, 58, 237, 0.12)" : "var(--bg-app)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: isSelected ? "var(--primary)" : "var(--text-main)" }}>
                        {r.patientName}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--primary)" }}>
                        {r.view}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      ID: {r.patientId} · {r.caseId.slice(0, 14)}...
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {r.studyDate}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", fontSize: "11px", color: "var(--text-muted)" }}>
                <span>{startIdx}–{endIdx} of {filteredReports.length}</span>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    className="page-btn"
                    disabled={safeActivePage === 1}
                    onClick={() => setActivePage(safeActivePage - 1)}
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    className="page-btn"
                    disabled={safeActivePage === totalPages}
                    onClick={() => setActivePage(safeActivePage + 1)}
                    style={{ padding: "2px 6px", fontSize: "11px" }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Full Formal Report Document */}
          {selectedReport && (
            <div className="card" style={{ padding: "28px", border: "1px solid var(--border)" }}>
              {/* Document Header & Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid var(--primary)",
                  paddingBottom: "16px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--primary)", letterSpacing: "1.5px" }}>
                    ORTHINX MEDICAL AI REPORT
                  </div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
                    AI-Assisted Knee Radiograph Analysis
                  </h2>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                    Case ID: <b>{selectedReport.caseId}</b> · Report ID: <b>{selectedReport.id}</b>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
                    <Printer size={14} /> Print
                  </button>
                  <AnimatedButton
                    variant="primary"
                    icon={<Download size={14} />}
                    onClick={() => handleDownloadPdf(selectedReport)}
                    disabled={downloadingId === selectedReport.id}
                    style={{ padding: "8px 18px", fontSize: "13px" }}
                  >
                    {downloadingId === selectedReport.id ? "Downloading..." : "Download Official PDF"}
                  </AnimatedButton>
                </div>
              </div>

              {/* 1. Patient Information */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                  1. Patient & Examination Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "14px",
                    padding: "16px",
                    background: "var(--bg-app)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Patient Name</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                      {selectedReport.patientName}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Patient ID</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>
                      {selectedReport.patientId}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Age & Sex</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                      {selectedReport.patientAge > 0 ? `${selectedReport.patientAge} yrs` : "—"} / {selectedReport.patientSex}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Study Date & Time</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                      {selectedReport.studyDate}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Attending Specialist</div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                      {selectedReport.doctorName}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Projection View</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)", marginTop: "2px" }}>
                      {selectedReport.view}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Image / Analysis Summary Viewport */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    2. Image / Morphological Analysis Summary
                  </div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {(
                      [
                        { id: "measurements", label: "Measurements" },
                        { id: "segmentation", label: "Segmentation" },
                        { id: "enhanced", label: "Enhanced" },
                        { id: "original", label: "Original" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                          border: `1px solid ${activeTab === t.id ? "var(--primary)" : "var(--border)"}`,
                          background: activeTab === t.id ? "var(--primary)" : "transparent",
                          color: activeTab === t.id ? "#fff" : "var(--text-muted)",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: activeTab === t.id ? 700 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    minHeight: "360px",
                    maxHeight: "480px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#080c14",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid var(--border)",
                  }}
                >
                  {currentReportImage ? (
                    <img
                      src={currentReportImage}
                      alt={`Case ${selectedReport.caseId} view`}
                      style={{ maxWidth: "100%", maxHeight: "460px", objectFit: "contain", display: "block" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                      <FileText size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                      <p style={{ margin: 0, fontSize: "13px" }}>Image not available</p>
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      left: "10px",
                      background: "rgba(0,0,0,0.75)",
                      color: "#ffffff",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    {activeTab} VIEW
                  </div>
                </div>
              </div>

              {/* 3. Analysis & QC Telemetry Summary */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                  3. Analysis & Quality Assessment Summary
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Analysis Status</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e", marginTop: "4px" }}>
                      {selectedReport.status}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Quality Control (QC)</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#22c55e", marginTop: "4px" }}>
                      {selectedReport.qcStatus}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Image Calibration</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: selectedReport.measurements.isCalibrated ? "#22c55e" : "#eab308", marginTop: "4px" }}>
                      {selectedReport.measurements.isCalibrated ? "Calibrated (mm)" : "Pixel Scale (px)"}
                    </div>
                  </div>

                  {selectedReport.qualityScore !== null && (
                    <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Assessment Quality Score</div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                        {selectedReport.qualityScore}%
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Quantitative Measurements */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                  4. Image-Derived Quantitative Measurements
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Femoral Mediolateral Width</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
                      {selectedReport.measurements.femoralWidth}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Femoral Anteroposterior (AP)</div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: selectedReport.measurements.femoralAP.includes("lateral") ? "var(--warning)" : "var(--text-main)", marginTop: "4px" }}>
                      {selectedReport.measurements.femoralAP}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Tibial Plateau Width</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>
                      {selectedReport.measurements.tibialWidth}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Tibial Anteroposterior (AP)</div>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: selectedReport.measurements.tibialAP.includes("lateral") ? "var(--warning)" : "var(--text-main)", marginTop: "4px" }}>
                      {selectedReport.measurements.tibialAP}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Medial Joint Space Width (JSW)</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                      {selectedReport.measurements.medialJSW}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Lateral Joint Space Width (JSW)</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                      {selectedReport.measurements.lateralJSW}
                    </div>
                  </div>

                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Minimum Focal Clearance (JSW Min)</div>
                    <div style={{ fontSize: "15px", fontWeight: 700, color: "#eab308", marginTop: "4px" }}>
                      {selectedReport.measurements.minJSW}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Meniscus Analysis */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                  5. Soft Tissue & Meniscus Assessment
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    background: "var(--bg-app)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                  }}
                >
                  {selectedReport.meniscusFindings}
                </div>
              </div>

              {/* 6. Regulatory & Clinical Safety Notice */}
              <div
                style={{
                  padding: "14px 16px",
                  background: "rgba(124, 58, 237, 0.08)",
                  borderRadius: "8px",
                  border: "1px solid rgba(124, 58, 237, 0.25)",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  lineHeight: "1.6",
                }}
              >
                <b style={{ color: "var(--primary)" }}>AI-Assisted Analysis Notice:</b> This report is generated algorithmically from digital knee radiographs to assist orthopedic workflow. AI measurements must be reviewed, corroborated, and validated by a qualified orthopedic clinician prior to diagnostic or surgical decisions.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};