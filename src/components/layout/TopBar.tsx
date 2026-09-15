import React, { useState } from "react";
import { useAuth } from "../../store/authStore";
import { useTheme } from "../../store/themeStore";
import { useAnalysisStore } from "../../store/analysisStore";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  User,
  LogOut,
  Settings,
  CheckCircle2,
  ChevronDown,
  Sun,
  Moon,
  PlusCircle,
  Activity,
  Menu,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface TopBarProps {
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const activeCase = useAnalysisStore((state) => state.activeCase);
  const activeCaseId = useAnalysisStore((state) => state.activeCaseId);
  const patientInfo = useAnalysisStore((state) => state.patientInfo);
  const startNewAnalysis = useAnalysisStore((state) => state.startNewAnalysis);

  const hasActiveCase = Boolean(
    activeCaseId ||
      activeCase?.caseId ||
      activeCase?.analysisResult ||
      activeCase?.uploadedFile
  );

  const handleStartNewCase = () => {
    startNewAnalysis();
    navigate("/analysis/upload");
  };

  // Derive human-readable page title and breadcrumbs from location
  const getPageBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/dashboard" || path === "/") {
      return { section: "Overview", title: "Dashboard" };
    }
    if (path === "/patients") {
      return { section: "Patients", title: "Patient Directory" };
    }
    if (path === "/patients/new") {
      return { section: "Patients", title: "New Patient Registration" };
    }
    if (path.startsWith("/patients/")) {
      return { section: "Patients", title: "Patient Clinical Record" };
    }
    if (path === "/analysis/upload") {
      return { section: "Clinical Analysis", title: "Upload & Calibrate" };
    }
    if (path === "/analysis/results") {
      return { section: "Clinical Analysis", title: "Analysis Results" };
    }
    if (path === "/analysis/measurements") {
      return { section: "Clinical Analysis", title: "Anatomical Measurements" };
    }
    if (path === "/analysis/meniscus") {
      return { section: "Clinical Analysis", title: "Meniscus Assessment" };
    }
    if (path === "/reports") {
      return { section: "Outputs", title: "Diagnostic Reports" };
    }
    if (path === "/settings") {
      return { section: "System", title: "Settings" };
    }
    if (path === "/help") {
      return { section: "System", title: "Help & Protocol Guide" };
    }
    return { section: "ORTHINX", title: "Medical AI" };
  };

  const breadcrumbs = getPageBreadcrumbs();

  return (
    <header className="app-topbar">
      {/* Left: Breadcrumbs & Page Context */}
      <div className="topbar-left" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {onToggleSidebar && (
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onToggleSidebar}
            title="Toggle navigation"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-main)",
              cursor: "pointer",
              padding: "6px",
              display: "none",
            }}
          >
            <Menu size={20} />
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{breadcrumbs.section}</span>
          <ChevronRight size={14} style={{ color: "var(--text-light)" }} />
          <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{breadcrumbs.title}</span>
        </div>

        {/* Start New Analysis Action CTA */}
        <button
          className="btn btn-primary btn-sm"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "6px",
            marginLeft: "8px",
          }}
          onClick={handleStartNewCase}
          title="Start a new analysis session (clears previous active case)"
        >
          <PlusCircle size={14} />
          <span>New Analysis</span>
        </button>
      </div>

      {/* Right: Active Case Context, System Status, Theme Toggle, Profile */}
      <div className="topbar-right" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        {/* Active Case Context Pill */}
        {hasActiveCase ? (
          <div
            onClick={() => navigate("/analysis/results")}
            title="Active Analysis Case - Click to view results"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 12px",
              background: "rgba(91, 75, 255, 0.1)",
              border: "1px solid rgba(91, 75, 255, 0.25)",
              borderRadius: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <Activity size={13} style={{ color: "var(--primary)" }} />
            <span style={{ color: "var(--text-muted)" }}>Case:</span>
            <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
              {patientInfo.patientName || activeCase?.patientName || "Current Patient"} ({patientInfo.patientId || activeCase?.patientId || "Active"})
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              padding: "4px 8px",
              borderRadius: "4px",
              background: "var(--bg-app)",
              border: "1px solid var(--border)",
            }}
          >
            No active case
          </div>
        )}

        {/* System Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "var(--text-muted)",
          }}
          title="ORTHINX Medical AI Inference Service Online"
        >
          <span className="status-dot online" style={{ width: "6px", height: "6px" }} />
          <span>System Ready</span>
        </div>

        {/* Theme Mode Toggle Button */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun size={17} className="theme-icon-sun" />
          ) : (
            <Moon size={17} className="theme-icon-moon" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div style={{ position: "relative" }}>
          <div
            className="user-profile-badge"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--primary-subtle)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={15} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.2 }}>
                {user?.name || "Dr. Alex Morgan"}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.2 }}>
                Orthopedic Surgeon
              </span>
            </div>
            <ChevronDown size={13} color="var(--text-muted)" />
          </div>

          {showProfileMenu && (
            <div
              style={{
                position: "absolute",
                top: "44px",
                right: 0,
                width: "190px",
                background: "var(--bg-surface)",
                borderRadius: "8px",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
                zIndex: 50,
                padding: "4px",
              }}
            >
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate("/settings");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Settings size={14} />
                <span>Settings</span>
              </button>
              <button
                onClick={async () => {
                  setShowProfileMenu(false);
                  await logout();
                  navigate("/login");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--danger)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
