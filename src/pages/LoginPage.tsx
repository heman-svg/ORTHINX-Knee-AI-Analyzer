import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import {
  Activity,
  ShieldCheck,
  Cpu,
  HeartHandshake,
  Lock,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import kneeSegmented from "../assets/knee_segmented.jpg";
import orthinxLogo from "../assets/orthinx_logo_clean.png";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("dr.alex@kneeai.health");
  const [password, setPassword] = useState("••••••••");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    setError("");
    try {
      await login(email, password);
    } catch {
      setError("Invalid medical credentials. Please try again.");
      throw new Error("Login failed");
    }
  };

  return (
    <div className="login-split-page">
      {/* Left Column: 3D Holographic Anatomy Hero */}
      <div className="login-hero-pane">
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", zIndex: 2 }}>
          <img
            src={orthinxLogo}
            alt="ORTHINX Logo"
            style={{
              width: "42px",
              height: "42px",
              objectFit: "contain",
              display: "block",
            }}
          />
          <span style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em" }}>ORTHINX</span>
        </div>

        {/* Center 3D Holographic Anatomy Showcase */}
        <div style={{ textAlign: "center", zIndex: 2, padding: "20px 0" }}>
          <div
            style={{
              position: "relative",
              maxWidth: "380px",
              margin: "0 auto 24px",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              boxShadow: "0 0 40px rgba(99, 102, 241, 0.25)",
            }}
          >
            <img
              src={kneeSegmented}
              alt="Holographic Knee Anatomy"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "16px",
                background: "linear-gradient(to top, rgba(15,23,42,0.9), transparent)",
                fontSize: "12px",
                color: "#cbd5e1",
              }}
            >
              Real-Time AI Multi-Compartment Volumetric Reconstruction
            </div>
          </div>

          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px", lineHeight: 1.2 }}>
            AI-Assisted Knee Assessment & Implant Planning
          </h1>
          <p style={{ fontSize: "15px", color: "#94a3b8", maxWidth: "460px", margin: "0 auto" }}>
            Precision automated 3D meniscus segmentation, real-time chondral thickness profiling, and patient-matched arthroplasty.
          </p>
        </div>

        {/* Footer Tagline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            fontSize: "13px",
            color: "#94a3b8",
            zIndex: 2,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} color="#818cf8" /> HIPAA Compliant
          </span>
          <span>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Cpu size={16} color="#818cf8" /> Deep Learning AI
          </span>
          <span>•</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <HeartHandshake size={16} color="#818cf8" /> FDA Cleared
          </span>
        </div>
      </div>

      {/* Right Column: Login Card */}
      <div className="login-form-pane">
        <div className="login-card-inner">
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              Clinical Portal
            </h2>
            <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              Sign in with your hospital or surgical center credentials
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "var(--danger-bg)",
                border: "1px solid var(--danger)",
                borderRadius: "8px",
                color: "var(--danger-text)",
                fontSize: "13px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="dr.alex@kneeai.health"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                <a href="#forgot" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 500 }}>
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <AnimatedButton
              type="submit"
              icon={<Lock size={16} />}
              loadingText="Verifying Credentials..."
              successText="Access Granted"
              onClick={handleLogin}
              onSuccess={() => navigate("/")}
              style={{ width: "100%", padding: "13px", borderRadius: "10px" }}
            >
              Sign In
            </AnimatedButton>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--text-muted)" }}>
            Need institutional access?{" "}
            <span style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Contact OrthoAdmin</span>
          </div>
        </div>
      </div>
    </div>
  );
};