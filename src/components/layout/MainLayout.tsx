import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAuth } from "../../store/authStore";
import { ErrorBoundary } from "../common/ErrorBoundary";

export const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-app, #050505)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="spinner-border text-primary"
            style={{
              width: "36px",
              height: "36px",
              margin: "0 auto 16px",
              borderColor: "var(--primary, #5B4BFF)",
              borderRightColor: "transparent",
            }}
          />
          <p style={{ color: "var(--text-muted, #737373)", fontSize: "14px", fontWeight: 500 }}>
            Initializing ORTHINX Clinical Suite...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="main-wrapper">
        <TopBar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="page-content" style={{ padding: "24px 32px", maxWidth: "1600px", width: "100%", margin: "0 auto" }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};