import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";

type Severity = "critical" | "high" | "moderate" | "stable" | "safe";

interface PatientRecord {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  studyDate: string;
  lastAnalysis: string;
  diagnosis: string;
  severity: Severity;
  score: number; // 0–100 clinical assessment score
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

const allPatients: PatientRecord[] = [
  // Critical cases
  { id: "P100201", name: "Margaret Chen", age: 72, sex: "F", studyDate: "22 Aug 2025", lastAnalysis: "22 Aug 2025", diagnosis: "Grade IV OA — Full-thickness cartilage loss", severity: "critical", score: 12 },
  { id: "P100202", name: "Harold Briggs", age: 78, sex: "M", studyDate: "21 Aug 2025", lastAnalysis: "21 Aug 2025", diagnosis: "Bilateral meniscal extrusion with bone edema", severity: "critical", score: 8 },
  { id: "P100203", name: "Dolores Vega", age: 81, sex: "F", studyDate: "20 Aug 2025", lastAnalysis: "20 Aug 2025", diagnosis: "Subchondral fracture — Urgent TKA evaluation", severity: "critical", score: 5 },
  { id: "P100204", name: "Eugene Park", age: 69, sex: "M", studyDate: "19 Aug 2025", lastAnalysis: "19 Aug 2025", diagnosis: "Massive ACL tear with medial meniscus bucket-handle", severity: "critical", score: 15 },

  // High Risk
  { id: "P100210", name: "Sarah Johnson", age: 58, sex: "F", studyDate: "18 Aug 2025", lastAnalysis: "18 Aug 2025", diagnosis: "Grade III chondromalacia — Progressive thinning", severity: "high", score: 28 },
  { id: "P100211", name: "Michael Brown", age: 61, sex: "M", studyDate: "17 Aug 2025", lastAnalysis: "17 Aug 2025", diagnosis: "Lateral meniscus posterior horn tear", severity: "high", score: 32 },
  { id: "P100212", name: "Anita Desai", age: 66, sex: "F", studyDate: "16 Aug 2025", lastAnalysis: "16 Aug 2025", diagnosis: "Medial compartment narrowing < 2mm", severity: "high", score: 25 },
  { id: "P100213", name: "Robert Williams", age: 63, sex: "M", studyDate: "15 Aug 2025", lastAnalysis: "16 Aug 2025", diagnosis: "Tibial plateau depression with bone bruise", severity: "high", score: 30 },
  { id: "P100214", name: "Fumiko Tanaka", age: 70, sex: "F", studyDate: "14 Aug 2025", lastAnalysis: "15 Aug 2025", diagnosis: "PCL insufficiency — Varus deformity 8°", severity: "high", score: 22 },

  // Moderate
  { id: "P100220", name: "Emily Davis", age: 52, sex: "F", studyDate: "13 Aug 2025", lastAnalysis: "13 Aug 2025", diagnosis: "Grade II cartilage defect — Medial femoral condyle", severity: "moderate", score: 48 },
  { id: "P100221", name: "James Wilson", age: 55, sex: "M", studyDate: "12 Aug 2025", lastAnalysis: "12 Aug 2025", diagnosis: "Meniscus thinning — Anterior horn 2.1mm", severity: "moderate", score: 52 },
  { id: "P100222", name: "Priya Sharma", age: 47, sex: "F", studyDate: "11 Aug 2025", lastAnalysis: "12 Aug 2025", diagnosis: "Patellofemoral syndrome — Mild subluxation", severity: "moderate", score: 55 },
  { id: "P100223", name: "Carlos Mendoza", age: 60, sex: "M", studyDate: "10 Aug 2025", lastAnalysis: "11 Aug 2025", diagnosis: "Osteochondral lesion 12mm — Lateral condyle", severity: "moderate", score: 42 },
  { id: "P100224", name: "Linda Martinez", age: 64, sex: "F", studyDate: "09 Aug 2025", lastAnalysis: "10 Aug 2025", diagnosis: "Baker's cyst with early OA changes", severity: "moderate", score: 50 },
  { id: "P100225", name: "Ahmed Hassan", age: 57, sex: "M", studyDate: "08 Aug 2025", lastAnalysis: "09 Aug 2025", diagnosis: "Medial plica syndrome — Chronic inflammation", severity: "moderate", score: 46 },

  // Stable
  { id: "P100230", name: "Patricia Anderson", age: 50, sex: "F", studyDate: "07 Aug 2025", lastAnalysis: "08 Aug 2025", diagnosis: "Grade I chondromalacia — Conservative Tx", severity: "stable", score: 72 },
  { id: "P100231", name: "David Kim", age: 44, sex: "M", studyDate: "06 Aug 2025", lastAnalysis: "07 Aug 2025", diagnosis: "Post-ACL reconstruction — 6 month follow-up", severity: "stable", score: 78 },
  { id: "P100232", name: "Susan O'Brien", age: 53, sex: "F", studyDate: "05 Aug 2025", lastAnalysis: "06 Aug 2025", diagnosis: "Meniscus repair healing — 4 month checkpoint", severity: "stable", score: 75 },
  { id: "P100233", name: "Rajesh Patel", age: 48, sex: "M", studyDate: "04 Aug 2025", lastAnalysis: "05 Aug 2025", diagnosis: "Mild effusion — Resolving post-arthroscopy", severity: "stable", score: 70 },
  { id: "P100234", name: "Maria Gonzalez", age: 56, sex: "F", studyDate: "03 Aug 2025", lastAnalysis: "04 Aug 2025", diagnosis: "Early medial OA — PRP therapy response", severity: "stable", score: 68 },
  { id: "P100235", name: "Thomas Wright", age: 62, sex: "M", studyDate: "02 Aug 2025", lastAnalysis: "03 Aug 2025", diagnosis: "Valgus alignment 4° — Monitoring progression", severity: "stable", score: 74 },

  // Safe
  { id: "P100240", name: "Jessica Lee", age: 34, sex: "F", studyDate: "01 Aug 2025", lastAnalysis: "02 Aug 2025", diagnosis: "Normal anatomy — Baseline sports screening", severity: "safe", score: 95 },
  { id: "P100241", name: "Daniel Hughes", age: 28, sex: "M", studyDate: "31 Jul 2025", lastAnalysis: "01 Aug 2025", diagnosis: "Post-meniscectomy — Full recovery confirmed", severity: "safe", score: 92 },
  { id: "P100242", name: "Wei Zhang", age: 40, sex: "M", studyDate: "30 Jul 2025", lastAnalysis: "31 Jul 2025", diagnosis: "Routine annual screening — No findings", severity: "safe", score: 98 },
  { id: "P100243", name: "Olivia Foster", age: 31, sex: "F", studyDate: "29 Jul 2025", lastAnalysis: "30 Jul 2025", diagnosis: "ACL graft maturation complete — Cleared", severity: "safe", score: 90 },
  { id: "P100244", name: "Kenji Nakamura", age: 37, sex: "M", studyDate: "28 Jul 2025", lastAnalysis: "29 Jul 2025", diagnosis: "Healthy cartilage — Athletic pre-season eval", severity: "safe", score: 96 },
  { id: "P100245", name: "Elena Rossi", age: 42, sex: "F", studyDate: "27 Jul 2025", lastAnalysis: "28 Jul 2025", diagnosis: "No degenerative changes — 2-year follow-up", severity: "safe", score: 94 },
];

const ROWS_PER_PAGE = 8;

export const PatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [sortField, setSortField] = useState<"score" | "date" | "name">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredPatients = useMemo(() => {
    let list = allPatients.filter(
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
  }, [searchTerm, severityFilter, sortField, sortAsc]);

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
    const c: Record<string, number> = { all: allPatients.length };
    for (const sev of ["critical", "high", "moderate", "stable", "safe"] as Severity[]) {
      c[sev] = allPatients.filter((p) => p.severity === sev).length;
    }
    return c;
  }, []);

  const handleSort = (field: "score" | "date" | "name") => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  };

  // Score bar color gradient based on value
  const getScoreColor = (score: number) => {
    if (score <= 20) return "#DC2626";
    if (score <= 40) return "#EA580C";
    if (score <= 60) return "#D97706";
    if (score <= 80) return "#0284C7";
    return "#16A34A";
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
        }}
      >
        <div>
          <h1 className="page-title">Patient Records</h1>
          <p className="page-subtitle" style={{ marginTop: "4px" }}>
            {allPatients.length} registered patients · {counts.critical} critical cases requiring attention
          </p>
        </div>
        <AnimatedButton
          variant="pill"
          icon={<Plus size={18} />}
          loadingText="Opening..."
          onClick={async () => {
            await new Promise((r) => setTimeout(r, 400));
          }}
          onSuccess={() => navigate("/patients/new")}
          style={{ padding: "10px 20px" }}
        >
          New Patient
        </AnimatedButton>
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
                  {counts[sev]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
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
              <th>Diagnosis</th>
              <th>Status</th>
              <th
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("score")}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  Score <ArrowUpDown size={12} color="var(--text-muted)" />
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
                  <td style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "220px" }}>
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

                  {/* Clinical Score with Visual Progress Bar */}
                  <td style={{ minWidth: "80px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          flex: 1,
                          height: "6px",
                          borderRadius: "3px",
                          background: "var(--border)",
                          overflow: "hidden",
                          minWidth: "40px",
                        }}
                      >
                        <div
                          style={{
                            width: `${patient.score}%`,
                            height: "100%",
                            borderRadius: "3px",
                            background: getScoreColor(patient.score),
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: getScoreColor(patient.score),
                          minWidth: "28px",
                          textAlign: "right",
                        }}
                      >
                        {patient.score}%
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="btn btn-secondary btn-icon"
                      onClick={() => navigate("/analysis/results")}
                      title="View Patient Analysis"
                      style={{ margin: "0 auto" }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {pagePatients.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--text-muted)",
                    fontSize: "14px",
                  }}
                >
                  No patients match your search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="pagination-wrapper">
          <span>
            Showing {filteredPatients.length > 0 ? startIdx : 0} to {endIdx} of{" "}
            {filteredPatients.length} patients
          </span>
          <div className="pagination-controls">
            <button
              className="page-btn"
              disabled={safeActivePage === 1}
              onClick={() => setActivePage(safeActivePage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                if (totalPages <= 5) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - safeActivePage) <= 1) return true;
                return false;
              })
              .reduce<(number | "...")[]>((acc, page, idx, arr) => {
                if (idx > 0 && page - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(page);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ell-${idx}`} style={{ padding: "0 4px", color: "var(--text-muted)" }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    className={`page-btn ${safeActivePage === item ? "active" : ""}`}
                    onClick={() => setActivePage(item as number)}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              className="page-btn"
              disabled={safeActivePage === totalPages}
              onClick={() => setActivePage(safeActivePage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};