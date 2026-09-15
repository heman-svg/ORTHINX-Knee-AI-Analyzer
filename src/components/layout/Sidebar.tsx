import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UploadCloud,
  FileCheck2,
  Ruler,
  Layers,
  FileText,
  Settings,
  HelpCircle,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAnalysisStore } from "../../store/analysisStore";
import orthinxLogo from "../../assets/orthinx_logo_clean.png";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const activeCase = useAnalysisStore((state) => state.activeCase);
  const activeCaseId = useAnalysisStore((state) => state.activeCaseId);
  const patientInfo = useAnalysisStore((state) => state.patientInfo);

  const hasActiveCase = Boolean(
    activeCaseId ||
      activeCase?.caseId ||
      activeCase?.analysisResult ||
      activeCase?.uploadedFile
  );

  const isAnalysisSectionActive = location.pathname.startsWith("/analysis");

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <NavLink to="/dashboard" className="brand-logo" title="ORTHINX Medical AI Analysis">
          <img
            src={orthinxLogo}
            alt="ORTHINX Logo"
            style={{
              width: "32px",
              height: "32px",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
            }}
          />
          {!collapsed && (
            <div className="brand-text-wrapper">
              <span className="brand-title">ORTHINX</span>
              <span className="brand-subtitle">MEDICAL AI ANALYSIS</span>
            </div>
          )}
        </NavLink>

        {onToggleCollapse && (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "4px",
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {/* MAIN Section */}
        {!collapsed && <div className="nav-group-label">MAIN</div>}
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="Dashboard"
        >
          <LayoutDashboard className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Dashboard</span>}
        </NavLink>

        {/* PATIENTS Section */}
        {!collapsed && <div className="nav-group-label" style={{ marginTop: "12px" }}>PATIENTS</div>}
        <NavLink
          to="/patients"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="Patient Directory"
        >
          <Users className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Patient Directory</span>}
        </NavLink>

        <NavLink
          to="/patients/new"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="New Patient"
        >
          <UserPlus className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">New Patient</span>}
        </NavLink>

        {/* CURRENT ANALYSIS Section */}
        <div
          className="nav-group-header"
          style={{
            marginTop: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 14px 4px",
          }}
        >
          {!collapsed && (
            <span className="nav-group-label" style={{ padding: 0, margin: 0 }}>
              CURRENT ANALYSIS
            </span>
          )}
          {!collapsed && (
            hasActiveCase ? (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#34d399",
                }}
              >
                Active
              </span>
            ) : (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "var(--bg-app)",
                  color: "var(--text-muted)",
                }}
              >
                Ready
              </span>
            )
          )}
        </div>

        <NavLink
          to="/analysis/upload"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="Upload X-Ray"
        >
          <UploadCloud className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Upload X-Ray</span>}
        </NavLink>

        <NavLink
          to="/analysis/results"
          className={({ isActive }) =>
            `nav-link ${isActive ? "active" : ""} ${!hasActiveCase ? "nav-link-subtle" : ""}`
          }
          title="Analysis Results"
        >
          <FileCheck2 className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Analysis Results</span>}
        </NavLink>

        <NavLink
          to="/analysis/measurements"
          className={({ isActive }) =>
            `nav-link ${isActive ? "active" : ""} ${!hasActiveCase ? "nav-link-subtle" : ""}`
          }
          title="Anatomical Measurements"
        >
          <Ruler className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Anatomical Measurements</span>}
        </NavLink>

        <NavLink
          to="/analysis/meniscus"
          className={({ isActive }) =>
            `nav-link ${isActive ? "active" : ""} ${!hasActiveCase ? "nav-link-subtle" : ""}`
          }
          title="Meniscus Analysis"
        >
          <Layers className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Meniscus Analysis</span>}
        </NavLink>

        {/* REPORTS Section */}
        {!collapsed && <div className="nav-group-label" style={{ marginTop: "12px" }}>REPORTS</div>}
        <NavLink
          to="/reports"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="Reports"
        >
          <FileText className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Reports</span>}
        </NavLink>

        {/* SYSTEM Section */}
        {!collapsed && <div className="nav-group-label" style={{ marginTop: "12px" }}>SYSTEM</div>}
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="Settings"
        >
          <Settings className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Settings</span>}
        </NavLink>

        <NavLink
          to="/help"
          className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          title="Help"
        >
          <HelpCircle className="nav-icon" size={18} />
          {!collapsed && <span className="nav-text">Help</span>}
        </NavLink>
      </nav>

      {/* Sidebar Footer: Active Case status */}
      {!collapsed && (
        <div className="sidebar-footer" style={{ padding: "14px", borderTop: "1px solid var(--border)" }}>
          {hasActiveCase ? (
            <div
              style={{
                padding: "10px 12px",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <Activity size={13} style={{ color: "#34d399" }} />
                <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                  CURRENT CASE
                </span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {patientInfo.patientName || activeCase?.patientName || "Loaded Patient"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--primary)", marginTop: "2px" }}>
                {patientInfo.patientId || activeCase?.patientId || activeCaseId || "Active"}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 8px" }}>
              <span className="status-dot online" style={{ width: "6px", height: "6px" }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>System Ready</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};