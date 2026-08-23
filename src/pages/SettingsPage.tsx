import React, { useState } from "react";
import { useAuth } from "../store/authStore";
import { useTheme } from "../store/themeStore";
import { useNavigate } from "react-router-dom";
import { Server, User, Moon, Sun } from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    name: "Dr. Alex Morgan",
    email: "dr.alex.morgan@orthoclinic.com",
    hospital: "Metropolitan Orthopedic Institute",
    pacsHost: "pacs.orthoclinic.internal",
    pacsPort: "104",
    pacsAETitle: "ORTHINX_PACS",
    autoExport: true,
    emailAlerts: true,
  });

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 800));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Workstation Settings</h1>
        <p className="page-subtitle">
          Manage clinical preferences, theme modes, DICOM PACS integration, and user profile.
        </p>
      </div>

      <div style={{ maxWidth: "800px" }}>
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Appearance & Theme Preference */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              {theme === "dark" ? <Moon size={18} color="var(--primary)" /> : <Sun size={18} color="var(--warning)" />}
              <span>Interface Appearance</span>
            </h2>

            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "16px" }}>
              Choose your preferred diagnostic environment. Dark theme reduces eye strain during low-light radiological viewing.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div
                onClick={() => setTheme("light")}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: `2px solid ${theme === "light" ? "var(--primary)" : "var(--border)"}`,
                  background: theme === "light" ? "var(--primary-light)" : "var(--bg-surface)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", color: "#D97706" }}>
                  <Sun size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>Light Mode</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Clean clinical daytime look</div>
                </div>
              </div>

              <div
                onClick={() => setTheme("dark")}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: `2px solid ${theme === "dark" ? "var(--primary)" : "var(--border)"}`,
                  background: theme === "dark" ? "var(--primary-light)" : "var(--bg-surface)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary-light)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                  <Moon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>Dark Mode</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Deep radiological contrast</div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Card */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <User size={18} color="var(--primary)" />
              <span>Surgeon Profile</span>
            </h2>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Institution / Hospital</label>
              <input
                type="text"
                className="form-input"
                value={settings.hospital}
                onChange={(e) => setSettings({ ...settings, hospital: e.target.value })}
              />
            </div>
          </div>

          {/* PACS / DICOM Server Integration */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Server size={18} color="var(--info)" />
              <span>DICOM PACS Integration</span>
            </h2>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">PACS Host / IP</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.pacsHost}
                  onChange={(e) => setSettings({ ...settings, pacsHost: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Port</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.pacsPort}
                  onChange={(e) => setSettings({ ...settings, pacsPort: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">AE Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.pacsAETitle}
                  onChange={(e) => setSettings({ ...settings, pacsAETitle: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
              onClick={handleLogout}
            >
              Sign Out
            </button>

            <AnimatedButton
              type="submit"
              loadingText="Saving Preferences..."
              successText="Preferences Saved!"
              onClick={handleSave}
            >
              Save Configuration
            </AnimatedButton>
          </div>
        </form>
      </div>
    </div>
  );
};