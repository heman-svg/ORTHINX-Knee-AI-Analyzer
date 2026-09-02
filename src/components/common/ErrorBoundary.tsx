import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, PlusCircle, LayoutDashboard } from "lucide-react";
import { useAnalysisStore } from "../../store/analysisStore";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ORTHINX_ERROR_BOUNDARY] Caught error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleStartNewAnalysis = () => {
    try {
      useAnalysisStore.getState().resetActiveCase();
    } catch (_) {}
    window.location.href = "/knee-analysis";
  };

  private handleBackToDashboard = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ maxWidth: "700px", margin: "80px auto", padding: "0 20px" }}>
          <div
            className="card"
            style={{
              padding: "48px 36px",
              textAlign: "center",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              background: "var(--bg-card, #1e1b4b)",
              borderRadius: "14px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                color: "#ef4444",
              }}
            >
              <AlertTriangle size={30} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
              Something went wrong
            </h2>

            <p style={{ fontSize: "14px", color: "var(--text-muted)", maxWidth: "440px", margin: "0 auto 26px" }}>
              Please try again or start a new analysis.
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px" }}
                onClick={this.handleRetry}
              >
                <RefreshCw size={15} /> Retry
              </button>

              <button
                className="btn btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px" }}
                onClick={this.handleStartNewAnalysis}
              >
                <PlusCircle size={15} /> Start New Analysis
              </button>

              <button
                className="btn btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 18px" }}
                onClick={this.handleBackToDashboard}
              >
                <LayoutDashboard size={15} /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
