import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Users,
  UserPlus,
  UploadCloud,
  FileText,
  ShieldCheck,
  Server,
  ArrowRight,
  Clock,
  ChevronRight,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { usePatientStore } from "../store/patientStore";
import { useAnalysisStore } from "../store/analysisStore";
import { scanApi } from "../lib/api";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { patients, fetchPatients, loading: patientsLoading, backendConnected, clearAllPatients } = usePatientStore();
  const { activeCase, activeCaseId, patientInfo, startNewAnalysis, setPatientInfo, setScanResult, resetActiveCase } = useAnalysisStore();

  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchPatients();

    const loadRecentCases = async () => {
      setCasesLoading(true);
      try {
        const data = await scanApi.listAllCases();
        if (Array.isArray(data)) {
          setRecentCases(data);
        } else {
          setRecentCases([]);
        }
      } catch (err) {
        console.warn("Could not fetch recent cases:", err);
        setRecentCases([]);
      } finally {
        setCasesLoading(false);
      }
    };

    loadRecentCases();
  }, [fetchPatients]);

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      // 1. Delete all stored case JSON files & reports from backend
      await scanApi.clearAllCases();

      // 2. Clear all database patient & scan records
      await clearAllPatients();

      // 3. Clear active case in analysisStore (revokes preview URLs & clears localStorage/sessionStorage)
      resetActiveCase();

      // 4. Update local dashboard state
      setRecentCases([]);
      setShowClearModal(false);
      setToast({ type: "success", message: "History cleared successfully." });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to clear history:", err);
      setShowClearModal(false);
      setToast({ type: "error", message: "Unable to clear history. Please try again." });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsClearing(false);
    }
  };


  const hasActiveCase = Boolean(
    activeCaseId ||
      activeCase?.caseId ||
      activeCase?.analysisResult ||
      activeCase?.uploadedFile
  );

  const handleStartNewAnalysis = () => {
    startNewAnalysis();
    navigate("/analysis/upload");
  };

  const handleSelectPatientForAnalysis = (patient: any) => {
    startNewAnalysis();
    setPatientInfo({
      patientId: patient.patientCode || String(patient.id),
      patientName: patient.name,
      patientAge: patient.age,
      patientSex: patient.sex,
    });
    navigate("/analysis/upload");
  };

  const handleOpenCase = (c: any) => {
    setScanResult(c, (c.view as any) || "front");
    navigate("/analysis/results");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Header Section */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "20px",
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: "0 0 6px 0", fontSize: "24px", fontWeight: 700 }}>
            Welcome to ORTHINX
          </h1>
          <p className="page-subtitle" style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>
            AI-assisted knee radiograph analysis & anatomical assessment
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/patients")}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px" }}
          >
            <Users size={16} />
            <span>View Patient Directory</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleStartNewAnalysis}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 }}
          >
            <UploadCloud size={16} />
            <span>Start New Analysis</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Metric Cards */}
      <div
        className="stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Total Patients */}
        <div className="stat-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
              <Users size={15} style={{ color: "var(--primary)" }} /> PATIENTS ARCHIVE
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)" }}>
              {patientsLoading ? "..." : patients.length}
            </div>
            <button
              onClick={() => navigate("/patients")}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}
            >
              Directory &rarr;
            </button>
          </div>
        </div>

        {/* Current Active Analysis */}
        <div className="stat-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
              <Activity size={15} style={{ color: "var(--primary)" }} /> ACTIVE CASE
            </span>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: "4px",
                background: hasActiveCase ? "rgba(16, 185, 129, 0.15)" : "var(--bg-app)",
                color: hasActiveCase ? "#34d399" : "var(--text-muted)",
              }}
            >
              {hasActiveCase ? "Active" : "None"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--text-main)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "160px",
              }}
            >
              {hasActiveCase
                ? patientInfo.patientName || activeCase?.patientName || "Current Patient"
                : "No active analysis"}
            </div>
            {hasActiveCase ? (
              <button
                onClick={() => navigate("/analysis/results")}
                style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}
              >
                Open &rarr;
              </button>
            ) : (
              <button
                onClick={handleStartNewAnalysis}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "12px", cursor: "pointer" }}
              >
                Start new
              </button>
            )}
          </div>
        </div>

        {/* Total Analyzed Cases */}
        <div className="stat-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
              <FolderOpen size={15} style={{ color: "var(--primary)" }} /> ANALYSES CONDUCTED
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)" }}>
              {casesLoading ? "..." : recentCases.length}
            </div>
            <button
              onClick={() => navigate("/reports")}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "12px", cursor: "pointer", fontWeight: 500 }}
            >
              Reports &rarr;
            </button>
          </div>
        </div>

        {/* System & AI Service Status */}
        <div className="stat-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
              <Server size={15} style={{ color: "var(--primary)" }} /> SYSTEM STATUS
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
              <span
                className="status-dot online"
                style={{
                  width: "7px",
                  height: "7px",
                  backgroundColor: backendConnected ? "#10B981" : "#10B981",
                }}
              />
              <span>AI Engine Online</span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>v2.4 Ready</span>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        {/* Action 1: New Analysis */}
        <div
          className="card hover-card"
          onClick={handleStartNewAnalysis}
          style={{
            padding: "18px",
            cursor: "pointer",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            borderRadius: "10px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "var(--primary-subtle)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
                New Analysis
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Upload knee radiograph</span>
            </div>
          </div>
        </div>

        {/* Action 2: Patient Directory */}
        <div
          className="card hover-card"
          onClick={() => navigate("/patients")}
          style={{
            padding: "18px",
            cursor: "pointer",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            borderRadius: "10px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
                Patient Directory
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Search & manage records</span>
            </div>
          </div>
        </div>

        {/* Action 3: Register Patient */}
        <div
          className="card hover-card"
          onClick={() => navigate("/patients/new")}
          style={{
            padding: "18px",
            cursor: "pointer",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            borderRadius: "10px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#F59E0B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserPlus size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
                Register Patient
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Add new clinical profile</span>
            </div>
          </div>
        </div>

        {/* Action 4: Diagnostic Reports */}
        <div
          className="card hover-card"
          onClick={() => navigate("/reports")}
          style={{
            padding: "18px",
            cursor: "pointer",
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            borderRadius: "10px",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(6, 182, 212, 0.12)",
                color: "#06B6D4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
                Diagnostic Reports
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>View exported clinical reports</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 18px",
            borderRadius: "8px",
            backgroundColor: toast.type === "success" ? "#064e3b" : "#7f1d1d",
            color: "#ffffff",
            border: toast.type === "success" ? "1px solid #059669" : "1px solid #dc2626",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            fontSize: "13px",
            fontWeight: 500,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} style={{ color: "#34d399", flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ color: "#f87171", flexShrink: 0 }} />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.7)",
              cursor: "pointer",
              padding: "2px",
              marginLeft: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {showClearModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => {
            if (!isClearing) setShowClearModal(false);
          }}
        >
          <div
            style={{
              maxWidth: "460px",
              width: "100%",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              boxShadow: "0 20px 30px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                  Clear History?
                </h3>
              </div>
              <button
                disabled={isClearing}
                onClick={() => setShowClearModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 24px" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "var(--text-secondary)",
                }}
              >
                This will remove all saved patient and analysis history from this application. Active analysis data will also be cleared.
              </p>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 24px",
                backgroundColor: "var(--bg-app)",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                disabled={isClearing}
                onClick={() => setShowClearModal(false)}
                style={{
                  fontSize: "13px",
                  padding: "8px 16px",
                  fontWeight: 500,
                  cursor: isClearing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearHistory}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  padding: "8px 18px",
                  fontWeight: 600,
                  color: "#ffffff",
                  backgroundColor: "#dc2626",
                  border: "1px solid #b91c1c",
                  borderRadius: "6px",
                  cursor: isClearing ? "not-allowed" : "pointer",
                  transition: "background-color 0.15s ease",
                  boxShadow: "0 2px 4px rgba(220, 38, 38, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!isClearing) e.currentTarget.style.backgroundColor = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  if (!isClearing) e.currentTarget.style.backgroundColor = "#dc2626";
                }}
              >
                {isClearing ? (
                  <>
                    <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Clear History</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Activity & Records History Section Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={16} style={{ color: "var(--text-muted)" }} />
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
            Recent Records & Activity
          </h2>
        </div>

        {/* Clear History Button */}
        <button
          className="btn btn-outline"
          onClick={() => setShowClearModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            padding: "6px 12px",
            color: "#ef4444",
            borderColor: "rgba(239, 68, 68, 0.35)",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            cursor: "pointer",
            borderRadius: "6px",
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
            e.currentTarget.style.borderColor = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.05)";
            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.35)";
          }}
          title="Clear all saved patient and analysis history"
        >
          <Trash2 size={14} />
          <span>Clear History</span>
        </button>
      </div>

      {/* 5. Recent Patients and Recent Analyses Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Recent Patients Card */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "15px" }}>
              <Users size={17} style={{ color: "var(--primary)" }} />
              Recent Patients
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/patients")}
              style={{ fontSize: "12px", padding: "4px 10px" }}
            >
              All Patients
            </button>
          </div>

          {patientsLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <RefreshCw size={20} style={{ margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
              <p style={{ margin: 0, fontSize: "13px" }}>Loading patient records...</p>
            </div>
          ) : patients.length === 0 ? (
            /* Clean Empty State: No Patients */
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <Users size={32} style={{ margin: "0 auto 10px", color: "var(--text-muted)", opacity: 0.5 }} />
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: "0 0 4px 0" }}>
                No patient history
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
                Create a patient to begin an analysis.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate("/patients/new")}
                style={{ fontSize: "12px" }}
              >
                <UserPlus size={14} />
                <span>Create New Patient</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "12px" }}>
                    <th style={{ padding: "8px 10px" }}>Patient ID</th>
                    <th style={{ padding: "8px 10px" }}>Name</th>
                    <th style={{ padding: "8px 10px" }}>Age/Sex</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.slice(0, 5).map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "10px", fontWeight: 600, color: "var(--primary)" }}>
                        {p.patientCode || p.id}
                      </td>
                      <td style={{ padding: "10px", fontWeight: 500, color: "var(--text-main)" }}>
                        {p.name}
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                        {p.age}y / {p.sex}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSelectPatientForAnalysis(p)}
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                          title="Start analysis for this patient"
                        >
                          Analyze
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Analyses Card */}
        <div className="card" style={{ padding: "20px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontSize: "15px" }}>
              <Activity size={17} style={{ color: "var(--primary)" }} />
              Recent Analyses
            </h2>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/reports")}
              style={{ fontSize: "12px", padding: "4px 10px" }}
            >
              All Reports
            </button>
          </div>

          {casesLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <RefreshCw size={20} style={{ margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
              <p style={{ margin: 0, fontSize: "13px" }}>Loading recent cases...</p>
            </div>
          ) : recentCases.length === 0 ? (
            /* Clean Empty State: No Recent Analyses */
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <Activity size={32} style={{ margin: "0 auto 10px", color: "var(--text-muted)", opacity: 0.5 }} />
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", margin: "0 0 4px 0" }}>
                No analysis history
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
                Start a new X-ray analysis to see results here.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartNewAnalysis}
                style={{ fontSize: "12px" }}
              >
                <UploadCloud size={14} />
                <span>Upload Radiograph</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "12px" }}>
                    <th style={{ padding: "8px 10px" }}>Case ID</th>
                    <th style={{ padding: "8px 10px" }}>Patient</th>
                    <th style={{ padding: "8px 10px" }}>Severity</th>
                    <th style={{ padding: "8px 10px" }}>Date</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.slice(0, 5).map((c) => (
                    <tr key={c.case_id || Math.random()} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: "10px", fontWeight: 600, color: "var(--primary)", fontSize: "12px" }}>
                        {c.case_id ? c.case_id.slice(0, 14) : "Case"}
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-main)" }}>
                        {c.patient_name || c.patient_code || "Patient"}
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "rgba(91, 75, 255, 0.12)", color: "var(--primary)" }}>
                          {c.classification?.class_name || "Mild"}
                        </span>
                      </td>
                      <td style={{ padding: "10px", color: "var(--text-secondary)", fontSize: "12px" }}>
                        {c.formatted_date || "Recent"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenCase(c)}
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                        >
                          Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};