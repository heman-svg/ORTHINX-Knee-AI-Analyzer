import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  User,
  Activity,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { scanApi, patientApi, BackendPatient } from "../lib/api";
import { useAnalysisStore } from "../store/analysisStore";

export interface AggregatedPatient {
  id: string;
  patientCode: string;
  name: string;
  age: number;
  sex: string;
  lastStudy: string;
  analysisCount: number;
  latestCaseId?: string;
  status: "Active" | "Completed" | "Pending";
  rawCases: any[];
}

const ROWS_PER_PAGE = 8;

export const PatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const store = useAnalysisStore();
  const [patients, setPatients] = useState<AggregatedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch cases from backend
      let allCases: any[] = [];
      try {
        allCases = await scanApi.listAllCases();
      } catch (e) {
        console.warn("Could not fetch case list:", e);
      }

      // 2. Fetch registered patients from backend
      let backendPatients: BackendPatient[] = [];
      try {
        backendPatients = await patientApi.list();
      } catch (e) {
        console.warn("Could not fetch backend patients:", e);
      }

      // Map to track unique patients by code/id
      const patientMap = new Map<string, AggregatedPatient>();

      // Populate from backend registered patients first
      if (Array.isArray(backendPatients)) {
        backendPatients.forEach((bp) => {
          const code = bp.patient_code || `PT-${bp.id}`;
          patientMap.set(code, {
            id: String(bp.id),
            patientCode: code,
            name: bp.name || `Patient ${code}`,
            age: bp.age || 0,
            sex: bp.sex === "M" || bp.sex === "m" ? "Male" : bp.sex === "F" || bp.sex === "f" ? "Female" : "Other",
            lastStudy: bp.created_at ? new Date(bp.created_at).toLocaleDateString() : "—",
            analysisCount: 0,
            status: "Active",
            rawCases: [],
          });
        });
      }

      // Merge and aggregate cases
      if (Array.isArray(allCases)) {
        allCases.forEach((c: any) => {
          const caseId = c.case_id || "";
          const patCode = c.patient_code || (c.patient_id ? String(c.patient_id) : `PT-${caseId.replace("case_", "").slice(0, 8).toUpperCase()}`);
          const patName = c.patient_name || `Patient ${patCode}`;
          const dateStr = c.formatted_date || (c.timestamp ? new Date(c.timestamp).toLocaleDateString() : new Date().toLocaleDateString());
          const age = c.patient_age || 0;
          const sex = c.patient_sex || "Unknown";

          if (patientMap.has(patCode)) {
            const existing = patientMap.get(patCode)!;
            existing.analysisCount += 1;
            existing.rawCases.push(c);
            if (!existing.latestCaseId) existing.latestCaseId = caseId;
            existing.lastStudy = dateStr;
            existing.status = "Completed";
          } else {
            patientMap.set(patCode, {
              id: patCode,
              patientCode: patCode,
              name: patName,
              age,
              sex: sex === "M" ? "Male" : sex === "F" ? "Female" : sex,
              lastStudy: dateStr,
              analysisCount: 1,
              latestCaseId: caseId,
              status: "Completed",
              rawCases: [c],
            });
          }
        });
      }

      // Add active case from store if not already present
      if (store.activeCaseId && store.patientInfo.patientId) {
        const storeCode = store.patientInfo.patientId;
        if (!patientMap.has(storeCode)) {
          patientMap.set(storeCode, {
            id: storeCode,
            patientCode: storeCode,
            name: store.patientInfo.patientName || `Patient ${storeCode}`,
            age: store.patientInfo.patientAge || 0,
            sex: store.patientInfo.patientSex || "Unknown",
            lastStudy: new Date().toLocaleDateString(),
            analysisCount: store.activeCase?.analysisResult ? 1 : 0,
            latestCaseId: store.activeCaseId,
            status: store.activeCase?.analysisResult ? "Completed" : "Active",
            rawCases: store.activeCase?.analysisResult ? [store.activeCase.analysisResult] : [],
          });
        }
      }

      setPatients(Array.from(patientMap.values()));
    } catch (err: any) {
      console.error("Failed to load patient records:", err);
      setError("Unable to load patient data. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / ROWS_PER_PAGE));
  const safeActivePage = Math.min(activePage, totalPages);
  const pagePatients = filteredPatients.slice(
    (safeActivePage - 1) * ROWS_PER_PAGE,
    safeActivePage * ROWS_PER_PAGE
  );
  const startIdx = (safeActivePage - 1) * ROWS_PER_PAGE + 1;
  const endIdx = Math.min(safeActivePage * ROWS_PER_PAGE, filteredPatients.length);

  const handleStartNewAnalysisForPatient = (patient: AggregatedPatient) => {
    store.startNewAnalysis();
    store.setPatientInfo({
      patientId: patient.patientCode,
      patientName: patient.name,
      patientAge: patient.age,
      patientSex: patient.sex,
    });
    navigate("/analysis/upload");
  };

  const handleViewPatientDetail = (patient: AggregatedPatient) => {
    navigate(`/patients/${encodeURIComponent(patient.patientCode || patient.id)}`);
  };

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
            CLINICAL ARCHIVES
          </div>
          <h1 className="page-title" style={{ marginTop: "4px" }}>
            Patient Directory
          </h1>
          <p className="page-subtitle" style={{ marginTop: "2px" }}>
            {patients.length} registered patient records with radiograph study history
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchPatients}
            title="Refresh patient records"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <AnimatedButton
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/patients/new")}
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            Create New Patient
          </AnimatedButton>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", minWidth: "300px", flex: "0 1 360px" }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            placeholder="Search by patient name or ID..."
            className="form-input"
            style={{ paddingLeft: "40px", borderRadius: "8px", width: "100%", height: "38px" }}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setActivePage(1);
            }}
          />
        </div>

        {/* Status Filters */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {["all", "completed", "active"].map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setActivePage(1);
                }}
                style={{
                  border: `1px solid ${isActive ? "var(--primary)" : "var(--border)"}`,
                  background: isActive ? "var(--primary-subtle, rgba(124, 58, 237, 0.12))" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: isActive ? 700 : 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s ease",
                }}
              >
                {st === "all" ? "All Patients" : st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "70px 20px" }}>
          <RefreshCw size={32} className="spin" color="var(--primary)" style={{ margin: "0 auto 12px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            Loading clinical patient records...
          </p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 20px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          <AlertCircle size={36} color="#ef4444" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
            {error}
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "18px" }}>
            Ensure the local backend server is operational on port 8000.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={fetchPatients}>
            Retry Connection
          </button>
        </div>
      ) : filteredPatients.length === 0 ? (
        /* Empty State */
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "70px 20px",
            background: "var(--bg-card)",
            border: "1px dashed var(--border)",
          }}
        >
          <User size={48} color="var(--text-muted)" style={{ margin: "0 auto 16px", opacity: 0.4 }} />
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>
            {searchTerm ? "No matching patients found" : "No patients available"}
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "460px", margin: "0 auto 24px" }}>
            {searchTerm
              ? `No patient records match '${searchTerm}'. Clear the search term to view all records.`
              : "No patient records have been registered or analyzed yet. Register a new patient to begin radiograph analysis."}
          </p>
          <AnimatedButton
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/patients/new")}
            style={{ padding: "10px 22px" }}
          >
            Create New Patient
          </AnimatedButton>
        </div>
      ) : (
        /* Patient Table */
        <div className="card" style={{ padding: "0", overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ padding: "14px 18px" }}>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Last Study</th>
                  <th>Analyses</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right", paddingRight: "18px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagePatients.map((patient) => (
                  <tr key={patient.patientCode || patient.id}>
                    {/* Patient ID */}
                    <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--primary)", fontSize: "13px" }}>
                      {patient.patientCode}
                    </td>

                    {/* Patient Name */}
                    <td style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "13px" }}>
                      {patient.name}
                    </td>

                    {/* Age */}
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {patient.age > 0 ? `${patient.age} yrs` : "—"}
                    </td>

                    {/* Sex */}
                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      {patient.sex}
                    </td>

                    {/* Last Study */}
                    <td style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                      {patient.lastStudy}
                    </td>

                    {/* Number of Analyses */}
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: patient.analysisCount > 0 ? "rgba(124, 58, 237, 0.15)" : "var(--bg-app)",
                          color: patient.analysisCount > 0 ? "var(--primary)" : "var(--text-muted)",
                          border: `1px solid ${patient.analysisCount > 0 ? "rgba(124, 58, 237, 0.3)" : "var(--border)"}`,
                        }}
                      >
                        {patient.analysisCount} {patient.analysisCount === 1 ? "case" : "cases"}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`badge ${patient.status === "Completed" ? "badge-success" : "badge-info"}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        {patient.status === "Completed" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {patient.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: "right", paddingRight: "18px" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewPatientDetail(patient)}
                          style={{ padding: "5px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                          title={`View patient record for ${patient.name}`}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleStartNewAnalysisForPatient(patient)}
                          style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          title={`Analyze radiograph for ${patient.name}`}
                        >
                          <Plus size={13} />
                          <span>New Scan</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 18px",
                borderTop: "1px solid var(--border)",
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
      )}
    </div>
  );
};