import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  AlertCircle,
  Clock,
  Filter,
  ArrowUpDown,
  RefreshCw,
  User,
  Activity,
  FileText,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { scanApi, patientApi } from "../lib/api";
import { useAnalysisStore } from "../store/analysisStore";

export type Severity = "critical" | "high" | "moderate" | "stable" | "safe";

export interface PatientRecord {
  id: string;
  caseId: string;
  name: string;
  age: number;
  sex: "M" | "F" | "U";
  studyDate: string;
  lastAnalysis: string;
  diagnosis: string;
  severity: Severity;
  score: number; // 0–100 clinical assessment score
  rawCase?: any;
}

const severityConfig: Record<
  Severity,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  critical: {
    label: "Critical",
    color: "#DC2626",
    bg: "rgba(220,38,38,0.10)",
    border: "rgba(220,38,38,0.25)",
    icon: <AlertTriangle size={12} />,
  },
  high: {
    label: "High Risk",
    color: "#EA580C",
    bg: "rgba(234,88,12,0.10)",
    border: "rgba(234,88,12,0.25)",
    icon: <AlertCircle size={12} />,
  },
  moderate: {
    label: "Moderate",
    color: "#D97706",
    bg: "rgba(217,119,6,0.10)",
    border: "rgba(217,119,6,0.25)",
    icon: <Clock size={12} />,
  },
  stable: {
    label: "Stable",
    color: "#0284C7",
    bg: "rgba(2,132,199,0.10)",
    border: "rgba(2,132,199,0.25)",
    icon: <ShieldCheck size={12} />,
  },
  safe: {
    label: "Safe",
    color: "#16A34A",
    bg: "rgba(22,163,74,0.10)",
    border: "rgba(22,163,74,0.25)",
    icon: <ShieldCheck size={12} />,
  },
};

const ROWS_PER_PAGE = 8;

export const PatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const store = useAnalysisStore();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [sortField, setSortField] = useState<"score" | "date" | "name">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const cases = await scanApi.listAllCases();
      const mapped: PatientRecord[] = [];

      if (cases && Array.isArray(cases)) {
        cases.forEach((c: any) => {
          const caseId = c.case_id || "";
          const m = c.measurements || {};
          const patCode = c.patient_code || `PT-${caseId.replace("case_", "").slice(0, 8).toUpperCase()}`;
          const patName = c.patient_name || `Patient ${patCode}`;
          const dateStr = c.formatted_date || (c.timestamp ? new Date(c.timestamp).toLocaleString() : new Date().toLocaleString());

          const medVal = m.medial_jsw?.value;
          let severity: Severity = "stable";
          let diagnosis = "Morphological boundary analysis completed.";
          let score = 80;

          if (medVal !== undefined && medVal !== null) {
            if (medVal < 2.0) {
              severity = "critical";
              diagnosis = `Severe joint space narrowing (< 2.0mm) — Medial JSW: ${medVal}mm`;
              score = 25;
            } else if (medVal < 3.5) {
              severity = "moderate";
              diagnosis = `Moderate joint space narrowing — Medial JSW: ${medVal}mm`;
              score = 55;
            } else {
              severity = "stable";
              diagnosis = `Preserved joint space clearance — Medial JSW: ${medVal}mm`;
              score = 88;
            }
          }

          mapped.push({
            id: patCode,
            caseId,
            name: patName,
            age: c.patient_age || 58,
            sex: (c.patient_sex || "F") as any,
            studyDate: dateStr,
            lastAnalysis: dateStr,
            diagnosis,
            severity,
            score,
            rawCase: c,
          });
        });
      }

      setPatients(mapped);
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    let list = patients.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (severityFilter !== "all") {
      list = list.filter((p) => p.severity === severityFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "score") cmp = a.score - b.score;
      else if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else cmp = new Date(b.studyDate).getTime() - new Date(a.studyDate).getTime();
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [patients, searchTerm, severityFilter, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / ROWS_PER_PAGE));
  const safeActivePage = Math.min(activePage, totalPages);
  const pagePatients = filteredPatients.slice(
    (safeActivePage - 1) * ROWS_PER_PAGE,
    safeActivePage * ROWS_PER_PAGE
  );
  const startIdx = (safeActivePage - 1) * ROWS_PER_PAGE + 1;
  const endIdx = Math.min(safeActivePage * ROWS_PER_PAGE, filteredPatients.length);

  // Severity counts for filter badges
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: patients.length };
    for (const sev of ["critical", "high", "moderate", "stable", "safe"] as Severity[]) {
      c[sev] = patients.filter((p) => p.severity === sev).length;
    }
    return c;
  }, [patients]);

  const handleSort = (field: "score" | "date" | "name") => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 20) return "#DC2626";
    if (score <= 40) return "#EA580C";
    if (score <= 60) return "#D97706";
    if (score <= 80) return "#0284C7";
    return "#16A34A";
  };

  const handleViewPatient = (patient: PatientRecord) => {
    if (patient.rawCase) {
      store.setScanResult(patient.rawCase, (patient.rawCase.view as any) || "front");
    }
    navigate(`/patients/${patient.caseId || patient.id}`);
  };

  return (
    <div>
      {/* Header */}
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
        <div>
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle" style={{ marginTop: "4px" }}>
            {patients.length} registered patient cases from uploaded radiographs · {counts.critical || 0} critical
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-outline"
            onClick={fetchPatients}
            title="Refresh list"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <AnimatedButton
            variant="pill"
            icon={<Plus size={18} />}
            onClick={() => {
              store.resetActiveCase();
              navigate("/knee-analysis");
            }}
            style={{ padding: "10px 20px" }}
          >
            New Patient Case
          </AnimatedButton>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", minWidth: "280px", flex: "0 1 320px" }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search by name, ID, or diagnosis..."
            className="form-input"
            style={{ paddingLeft: "40px", borderRadius: "8px", width: "100%" }}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setActivePage(1);
            }}
          />
        </div>

        {/* Severity Filter Pills */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Filter size={14} color="var(--text-muted)" style={{ marginRight: "2px" }} />
          {(["all", "critical", "high", "moderate", "stable", "safe"] as const).map((sev) => {
            const isActive = severityFilter === sev;
            const cfg = sev === "all" ? null : severityConfig[sev];
            return (
              <button
                key={sev}
                onClick={() => {
                  setSeverityFilter(sev);
                  setActivePage(1);
                }}
                style={{
                  border: `1px solid ${isActive ? (cfg ? cfg.color : "var(--primary)") : "var(--border)"}`,
                  background: isActive ? (cfg ? cfg.bg : "var(--primary-subtle)") : "transparent",
                  color: isActive ? (cfg ? cfg.color : "var(--primary)") : "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: "16px",
                  fontSize: "11px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.2s ease",
                }}
              >
                {sev === "all" ? "All" : cfg!.label}
                <span
                  style={{
                    background: isActive ? (cfg ? cfg.color : "var(--primary)") : "var(--border)",
                    color: isActive ? "#fff" : "var(--text-muted)",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: "8px",
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {counts[sev] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 0" }}>
          <RefreshCw size={30} className="spin" color="var(--primary)" />
          <p style={{ color: "var(--text-muted)", marginTop: "12px", fontSize: "14px" }}>
            Loading patient records...
          </p>
        </div>
      ) : filteredPatients.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
          }}
        >
          <User size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px", opacity: 0.5 }} />
          <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>
            No Patient Records Found
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 24px" }}>
            Patient records are created automatically when an X-ray image is uploaded and analyzed. Start a new analysis to create real patient records.
          </p>
          <AnimatedButton
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/knee-analysis")}
          >
            Analyze Knee X-Ray
          </AnimatedButton>
        </div>
      ) : (
        /* Table */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("name")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Name <ArrowUpDown size={12} color="var(--text-muted)" />
                  </span>
                </th>
                <th>Age / Sex</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("date")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Study Date <ArrowUpDown size={12} color="var(--text-muted)" />
                  </span>
                </th>
                <th>Diagnosis & Findings</th>
                <th>Status</th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("score")}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    Clinical Score <ArrowUpDown size={12} color="var(--text-muted)" />
                  </span>
                </th>
                <th style={{ textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagePatients.map((patient) => {
                const cfg = severityConfig[patient.severity];
                return (
                  <tr key={patient.id}>
                    {/* ID */}
                    <td style={{ color: "var(--primary)", fontWeight: 600, fontSize: "13px" }}>
                      {patient.id}
                    </td>

                    {/* Name */}
                    <td style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "13px" }}>
                      {patient.name}
                    </td>

                    {/* Age / Sex */}
                    <td style={{ fontSize: "13px" }}>
                      {patient.age} / {patient.sex}
                    </td>

                    {/* Study Date */}
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {patient.studyDate}
                    </td>

                    {/* Diagnosis */}
                    <td style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "240px" }}>
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          lineHeight: "1.4",
                        }}
                      >
                        {patient.diagnosis}
                      </span>
                    </td>

                    {/* Severity Status Badge */}
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 10px",
                          borderRadius: "16px",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </td>

                    {/* Score with Mini Progress Bar */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "50px",
                            height: "6px",
                            background: "var(--border)",
                            borderRadius: "3px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${patient.score}%`,
                              height: "100%",
                              background: getScoreColor(patient.score),
                              borderRadius: "3px",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: getScoreColor(patient.score),
                            minWidth: "24px",
                          }}
                        >
                          {patient.score}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: "center" }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleViewPatient(patient)}
                        style={{ padding: "5px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                        title="View Full Anatomical Analysis"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          <div>
            Showing {startIdx}–{endIdx} of {filteredPatients.length} patients
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className="page-btn"
              disabled={safeActivePage === 1}
              onClick={() => setActivePage(safeActivePage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`page-btn ${safeActivePage === p ? "active" : ""}`}
                onClick={() => setActivePage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={safeActivePage === totalPages}
              onClick={() => setActivePage(safeActivePage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};