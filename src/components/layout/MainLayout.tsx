import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useAuth } from "../../store/authStore";

export const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div className="ai-glow-orb" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "#64748b", fontWeight: 500 }}>Loading KneeAI Clinical Suite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-wrapper">
        <TopBar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};