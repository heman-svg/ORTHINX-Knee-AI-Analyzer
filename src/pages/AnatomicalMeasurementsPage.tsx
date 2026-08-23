import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Ruler, CheckCircle2, Sparkles } from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";

export const AnatomicalMeasurementsPage: React.FC = () => {
  const navigate = useNavigate();

  const tabs = [
    { id: "overview", label: "Overview", path: "/analysis/results" },
    { id: "meniscus", label: "Meniscus Analysis", path: "/analysis/meniscus" },
    { id: "measurements", label: "Anatomical Measurements", path: "/analysis/measurements" },
    { id: "implant", label: "Implant Recommendation", path: "/implant-planning" },
  ];

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
              onClick={() => navigate(tab.path)}
              style={{
                border: "none",
                background: "none",
                padding: "12px 4px",
                fontSize: "14px",
                fontWeight: tab.id === "measurements" ? 600 : 500,
                color: tab.id === "measurements" ? "var(--primary)" : "var(--text-muted)",
                borderBottom: `2px solid ${tab.id === "measurements" ? "var(--primary)" : "transparent"}`,
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

      <div className="page-header">
        <h1 className="page-title">Anatomical Morphometry</h1>
        <p className="page-subtitle">
          Automated multi-planar joint parameters extracted from 3D AI segmentation masks.
        </p>
      </div>

      {/* Main Measurements Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Femoral Measurements */}
        <div className="card">
          <h2 className="card-title" style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Ruler size={18} />
            <span>Femoral Parameters</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Femoral Mediolateral Width</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>68.4 mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Femoral AP Dimension</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>59.2 mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Medial Condyle Radius</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>21.4 mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Lateral Condyle Radius</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>19.8 mm</span>
            </div>
          </div>
        </div>

        {/* Tibial Measurements */}
        <div className="card">
          <h2 className="card-title" style={{ color: "var(--info)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Ruler size={18} />
            <span>Tibial Plateau Parameters</span>
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Tibial Plateau Width</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>71.8 mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Tibial AP Dimension</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>48.5 mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Medial Plateau Depth</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>3.1 mm</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
              <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>Posterior Slope Angle</span>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>6.8°</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cartilage & Meniscus Summary */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h2 className="card-title" style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <CheckCircle2 size={18} />
          <span>Cartilage & Meniscus Quality Assessment</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div style={{ padding: "14px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Medial Meniscus (Avg)</span>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>3.2 mm</p>
            <span style={{ fontSize: "12px", color: "var(--warning)" }}>Focal thinning in posterior horn</span>
          </div>
          <div style={{ padding: "14px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Lateral Meniscus (Avg)</span>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>4.1 mm</p>
            <span style={{ fontSize: "12px", color: "var(--success)" }}>Intact physiological morphology</span>
          </div>
          <div style={{ padding: "14px", background: "var(--primary-subtle)", borderRadius: "8px", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Joint Line Alignment</span>
            <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginTop: "4px" }}>178.2°</p>
            <span style={{ fontSize: "12px", color: "var(--info)" }}>1.8° Varus mechanical axis</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <AnimatedButton
          variant="pill"
          icon={<ArrowRight size={16} />}
          loadingText="Loading Implant Matcher..."
          onClick={async () => {
            await new Promise((r) => setTimeout(r, 600));
          }}
          onSuccess={() => navigate("/implant-planning")}
          style={{ padding: "12px 32px" }}
        >
          Proceed to Implant Recommendation
        </AnimatedButton>
      </div>
    </div>
  );
};