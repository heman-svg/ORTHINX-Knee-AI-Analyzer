import React, { useState } from "react";
import { useAuth } from "../../store/authStore";
import { useTheme } from "../../store/themeStore";
import { useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Settings, CheckCircle2, ChevronDown, Sun, Moon } from "lucide-react";

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    { id: 1, title: "Analysis Complete", desc: "Patient Sarah Johnson (P123456) ready", time: "5m ago", unread: true },
    { id: 2, title: "Implant Match Ready", desc: "Size 4 recommended for Michael Brown", time: "1h ago", unread: true },
    { id: 3, title: "New Study Uploaded", desc: "MRI Scan (Right Knee) for Emily Davis", time: "3h ago", unread: false },
  ];

  return (
    <header className="app-topbar">
      <div></div>

      <div className="topbar-right">
        {/* Dark / Light Mode Animated Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun size={18} className="theme-icon-sun" />
          ) : (
            <Moon size={18} className="theme-icon-moon" />
          )}
        </button>

        {/* Notification Bell */}
        <div style={{ position: "relative" }}>
          <button
            className="notification-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            title="Notifications"
          >
            <Bell size={18} />
            <span className="notification-badge">2</span>
          </button>

          {showNotifications && (
            <div
              style={{
                position: "absolute",
                top: "48px",
                right: 0,
                width: "320px",
                background: "var(--bg-surface)",
                borderRadius: "12px",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border-light)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-main)" }}>Notifications</span>
                <span style={{ fontSize: "12px", color: "var(--primary)", cursor: "pointer", fontWeight: 500 }}>Mark all read</span>
              </div>
              <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border-light)",
                      background: n.unread ? "var(--primary-light)" : "var(--bg-surface)",
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onClick={() => {
                      setShowNotifications(false);
                      navigate("/analysis/results");
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle2 size={14} color="#10B981" />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>{n.title}</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "3px 0 0 22px" }}>{n.desc}</p>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: "22px", display: "block", marginTop: "2px" }}>
                      {n.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div style={{ position: "relative" }}>
          <div
            className="user-profile-badge"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <span className="user-name">Dr. Alex Morgan</span>
              <span className="user-role">Orthopedic Surgeon</span>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </div>

          {showProfileMenu && (
            <div
              style={{
                position: "absolute",
                top: "48px",
                right: 0,
                width: "200px",
                background: "var(--bg-surface)",
                borderRadius: "12px",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
                zIndex: 50,
                padding: "6px",
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
                  gap: "10px",
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <Settings size={15} />
                Settings
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
                  gap: "10px",
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  color: "var(--danger)",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
