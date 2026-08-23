import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  ArrowRight,
  GitCompare,
  Sparkles,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";

export const ImplantRecommendationPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("implant");
  const [selectedSize, setSelectedSize] = useState("Size 4 (Standard)");
  const [showCompareModal, setShowCompareModal] = useState(false);

  const tabs = [
    { id: "overview", label: "Overview", path: "/analysis/results" },
    { id: "meniscus", label: "Meniscus Analysis", path: "/analysis/meniscus" },
    { id: "measurements", label: "Anatomical Measurements", path: "/analysis/measurements" },
    { id: "implant", label: "Implant Recommendation", path: "/implant-planning" },
  ];

  const handleProceed = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  return (
    <div>
      {/* Sub-Navigation Tabs Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", gap: "24px" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                navigate(tab.path);
              }}
              style={{
                border: "none",
                background: "none",
                padding: "12px 4px",
                fontSize: "14px",
                fontWeight: tab.id === "implant" ? 600 : 500,
                color: tab.id === "implant" ? "var(--primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${tab.id === "implant" ? "var(--primary)" : "transparent"}`,
                cursor: "pointer",
                marginBottom: "-1px",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          className="btn btn-secondary btn-sm"
          style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "6px" }}
          onClick={() => alert("Study Case ID: STD-2025-9843-KNEE")}
        >
          <Sparkles size={14} color="var(--primary)" />
          <span>Case #STD-9843</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Left Column: Patient Measurements & Parameters */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Patient Morphological Parameters</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Femoral Mediolateral Width</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>68.4 mm</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Femoral Anteroposterior (AP)</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>59.2 mm</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Tibial Plateau Width</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>71.8 mm</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Tibial Anteroposterior (AP)</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>48.5 mm</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>Meniscus Avg Thickness</span>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)" }}>3.2 mm</span>
            </div>
          </div>
        </div>

        {/* Right Column: Implant System & Matching Selection */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Select Implant System</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Implant Brand / System</label>
            <select className="form-select" defaultValue="Stryker Triathlon Total Knee System">
              <option value="Stryker Triathlon Total Knee System">Stryker Triathlon Total Knee System</option>
              <option value="Zimmer Biomet Persona Knee">Zimmer Biomet Persona Knee</option>
              <option value="DePuy Synthes ATTUNE System">DePuy Synthes ATTUNE System</option>
              <option value="Smith & Nephew LEGION CR">Smith & Nephew LEGION CR</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Recommended Component Size</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { size: "Size 4 (Standard)", match: "97% Fit", rank: "Best Match", note: "Anterior overhang < 0.3mm" },
                { size: "Size 3 (Narrow)", match: "91% Fit", rank: "Alternate", note: "Lateral under-coverage ~1.8mm" },
                { size: "Size 5 (Extended)", match: "86% Fit", rank: "Alternate", note: "Medial overhang ~2.1mm" },
              ].map((item) => (
                <div
                  key={item.size}
                  onClick={() => setSelectedSize(item.size)}
                  style={{
                    padding: "12px 16px",
                    border: `1.5px solid ${selectedSize === item.size ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "10px",
                    background: selectedSize === item.size ? "var(--primary-light)" : "var(--bg-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="radio"
                      name="implant-size"
                      checked={selectedSize === item.size}
                      onChange={() => setSelectedSize(item.size)}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
                        {item.size}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.note}</div>
                    </div>
                  </div>
                  <span
                    className={`badge ${item.rank === "Best Match" ? "badge-success" : "badge-primary"}`}
                  >
                    {item.match}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen 8 Trophy Banner Highlight */}
      <div className="recommendation-banner">
        <div className="trophy-badge">
          <Trophy size={24} />
        </div>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
            Recommended: Size 4 Cruciate Retaining (CR) Implant
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Based on deep learning segmentation of 3D bone contours and joint line alignment, <strong>Size 4</strong> delivers a 97% morphological match with optimal tibial plateau coverage and balanced mediolateral overhang.
          </p>
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
        <button
          className="btn btn-secondary btn-pill"
          style={{ padding: "10px 24px" }}
          onClick={() => setShowCompareModal(true)}
        >
          <GitCompare size={16} />
          <span>Compare Sizes</span>
        </button>

        <AnimatedButton
          variant="pill"
          icon={<ArrowRight size={16} />}
          loadingText="Compiling Plan..."
          successText="Plan Approved!"
          onClick={handleProceed}
          onSuccess={() => navigate("/reports")}
          style={{ padding: "10px 28px" }}
        >
          Proceed to Report
        </AnimatedButton>
      </div>

      {/* Comparison Modal */}
      {showCompareModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "24px",
          }}
          onClick={() => setShowCompareModal(false)}
        >
          <div
            className="card"
            style={{ maxWidth: "620px", width: "100%", background: "var(--bg-surface)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 className="card-title">Implant Size Comparison Matrix</h3>
              <button
                onClick={() => setShowCompareModal(false)}
                style={{ border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <table className="data-table" style={{ marginTop: "12px" }}>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Patient Target</th>
                  <th>Size 4 (Best)</th>
                  <th>Size 3</th>
                  <th>Size 5</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Femoral Width</td>
                  <td>68.4 mm</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>68.2 mm (Δ 0.2)</td>
                  <td>65.0 mm (Δ 3.4)</td>
                  <td>71.5 mm (Δ 3.1)</td>
                </tr>
                <tr>
                  <td>Femoral AP</td>
                  <td>59.2 mm</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>59.0 mm (Δ 0.2)</td>
                  <td>55.4 mm (Δ 3.8)</td>
                  <td>61.2 mm (Δ 2.0)</td>
                </tr>
                <tr>
                  <td>Tibial Width</td>
                  <td>71.8 mm</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>72.0 mm (Δ 0.2)</td>
                  <td>68.5 mm (Δ 3.3)</td>
                  <td>75.2 mm (Δ 3.4)</td>
                </tr>
                <tr>
                  <td>Overall Fit</td>
                  <td>100%</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>97% Match</td>
                  <td>91% Match</td>
                  <td>86% Match</td>
                </tr>
              </tbody>
            </table>

            <div style={{ textAlign: "right", marginTop: "24px" }}>
              <button
                className="btn btn-primary btn-pill"
                onClick={() => setShowCompareModal(false)}
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};