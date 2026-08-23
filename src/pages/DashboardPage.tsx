import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Clock,
  CheckCircle,
  Layers,
  Calendar,
  RotateCw,
  ZoomIn,
  Move,
  Ruler,
  Tag,
  RefreshCw,
  Maximize2,
  Sparkles,
  ChevronDown,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { InteractiveTrendChart } from "../components/ui/InteractiveTrendChart";
import { ThreeKneeVisualizer } from "../components/ui/ThreeKneeVisualizer";
import kneeSegmented from "../assets/knee_segmented.jpg";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [avgThickness, setAvgThickness] = useState(3.4);
  const [activeTab, setActiveTab] = useState<"anatomy" | "segmentation">("anatomy");
  const [viewAngle, setViewAngle] = useState<"front" | "side" | "top" | "45">("front");
  const [showLabels, setShowLabels] = useState(true);
  const [activeTool, setActiveTool] = useState<"rotate" | "zoom" | "pan" | "measure" | "labels" | "reset">("rotate");
  const [selectedAnatomy, setSelectedAnatomy] = useState<"femur" | "patella" | "lateral" | "medial" | "tibia" | null>(null);

  const handleToolClick = (tool: "rotate" | "zoom" | "pan" | "measure" | "labels" | "reset") => {
    setActiveTool(tool);
    if (tool === "labels") {
      setShowLabels(!showLabels);
    } else if (tool === "reset") {
      setViewAngle("front");
      setShowLabels(true);
      setSelectedAnatomy(null);
      setActiveTool("rotate");
    }
  };

  const anatomyDetails = {
    femur: {
      title: "Femur (Distal Bone)",
      description: "The femur is the thigh bone. The distal segment features two articulating condyles that form the top shelf of the knee joint.",
      metrics: "Reconstructed Width: 72.4 mm | Femoral AP: 52.6 mm",
    },
    patella: {
      title: "Patella (Kneecap)",
      description: "A thick flat triangular sesamoid bone that articulates with the femur. Provides mechanical extension leverage.",
      metrics: "Limb Alignment: Normal | Tracking: Intact",
    },
    lateral: {
      title: "Lateral Meniscus (Cartilage)",
      description: "Crescent-shaped fibrocartilaginous band protecting the lateral tibial plateau. Crucial shock absorber.",
      metrics: "Thickness: 3.1 mm (Target: Normal range)",
    },
    medial: {
      title: "Medial Meniscus (Cartilage)",
      description: "C-shaped fibrocartilage buffer on the inner side of the knee joint, carrying significant load-bearing stress.",
      metrics: "Thickness: 3.4 mm (Middle: 3.4 mm - Optimal)",
    },
    tibia: {
      title: "Tibia (Proximal Bone)",
      description: "The shin bone. The proximal tibia plateau supports the meniscus buffers and provides skeletal alignment stability.",
      metrics: "Reconstructed Width: 61.8 mm | Tibial AP: 41.2 mm",
    },
  };

  return (
    <div>
      {/* Top Welcome & KPI Metrics */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 className="page-title">Diagnostic Dashboard</h1>
          <p className="page-subtitle">Overview of deep learning knee assessment & automated implant sizing</p>
        </div>

        <AnimatedButton
          icon={<Calendar size={16} />}
          loadingText="Starting Session..."
          successText="Session Ready"
          onClick={async () => {
            await new Promise((r) => setTimeout(r, 600));
          }}
          onSuccess={() => navigate("/upload")}
        >
          New Analysis
        </AnimatedButton>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        {/* Total Patients */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={14} color="var(--primary)" /> Total Patients
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "28px" }}>1,284</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 8px" }}>+12%</span>
              <span style={{ fontSize: "9px", color: "var(--text-light)", marginTop: "2px" }}>vs last month</span>
            </div>
          </div>
        </div>

        {/* Pending Analyses */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} color="#EA580C" /> Pending Analyses
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "28px" }}>3</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="badge badge-warning" style={{ fontSize: "10px", padding: "2px 8px", color: "#EA580C", background: "rgba(234,88,12,0.10)" }}>↓ -2</span>
              <span style={{ fontSize: "9px", color: "var(--text-light)", marginTop: "2px" }}>vs yesterday</span>
            </div>
          </div>
        </div>

        {/* Completed Analyses */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CheckCircle size={14} color="var(--success)" /> Completed Analyses
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "28px" }}>1,142</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 8px" }}>+8%</span>
              <span style={{ fontSize: "9px", color: "var(--text-light)", marginTop: "2px" }}>vs last month</span>
            </div>
          </div>
        </div>

        {/* Avg Meniscus Thickness */}
        <div className="stat-card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span className="stat-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={14} color="var(--primary)" /> Avg Meniscus Thickness
            </span>
          </div>
          <div className="stat-value-wrap" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div className="stat-number" style={{ fontSize: "28px" }}>{avgThickness.toFixed(1)} mm</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span className="badge badge-success" style={{ fontSize: "10px", padding: "2px 8px" }}>Normal</span>
              <span style={{ fontSize: "9px", color: "var(--text-light)", marginTop: "2px" }}>Within normal range</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: 3D Knee Anatomy Visualizer & Measurements Sidebar Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px", marginBottom: "24px" }}>
        
        {/* Left Side: 3D Knee Anatomy Visualizer */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "20px", position: "relative" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                3D Knee Anatomy
                <span
                  style={{
                    fontSize: "11px",
                    background: "var(--primary-light)",
                    color: "var(--primary)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontWeight: 600,
                  }}
                >
                  Interactive Scan
                </span>
              </h2>
            </div>
            {/* Tab selector */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-app)",
                padding: "3px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <button
                onClick={() => setActiveTab("anatomy")}
                style={{
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "anatomy" ? "var(--bg-surface)" : "transparent",
                  color: activeTab === "anatomy" ? "var(--primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "anatomy" ? "var(--shadow-xs)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Anatomy
              </button>
              <button
                onClick={() => setActiveTab("segmentation")}
                style={{
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: activeTab === "segmentation" ? "var(--bg-surface)" : "transparent",
                  color: activeTab === "segmentation" ? "var(--primary)" : "var(--text-secondary)",
                  boxShadow: activeTab === "segmentation" ? "var(--shadow-xs)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                AI Segmentation
              </button>
            </div>
          </div>

          {/* Visualizer Workspace */}
          <div style={{ display: "flex", flex: 1, position: "relative", gap: "16px", minHeight: "380px" }}>
            
            {/* Left Edge Toolbar (Vertical) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "var(--bg-app)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "8px",
                width: "56px",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              {[
                { id: "rotate", label: "Rotate", icon: RotateCw },
                { id: "zoom", label: "Zoom", icon: ZoomIn },
                { id: "pan", label: "Pan", icon: Move },
                { id: "measure", label: "Measure", icon: Ruler },
                { id: "labels", label: "Labels", icon: Tag },
                { id: "reset", label: "Reset", icon: RefreshCw },
              ].map((tool) => {
                const ToolIcon = tool.icon;
                const isSelected = activeTool === tool.id || (tool.id === "labels" && showLabels);
                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool.id as any)}
                    title={tool.label}
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "8px",
                      border: "none",
                      background: isSelected ? "var(--primary)" : "transparent",
                      color: isSelected ? "#fff" : "var(--text-secondary)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <ToolIcon size={16} />
                    <span style={{ fontSize: "8px", fontWeight: 500 }}>{tool.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Central Hologram/Scan Viewing Area */}
            <div
              style={{
                flex: 1,
                position: "relative",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                overflow: "hidden",
                background: "#000000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "420px",
              }}
            >
              <img
                src={kneeSegmented}
                alt="Knee MRI Segmentation Scan"
                style={{
                  width: "100%",
                  height: "100%",
                  maxHeight: "560px",
                  objectFit: "contain",
                  display: "block",
                  imageRendering: "auto",
                  transition: "all 0.3s ease",
                }}
              />

              {/* Interactive labels and connector lines overlay */}
              {showLabels && (
                <>
                  {/* Femur Pin */}
                  <div style={{ position: "absolute", top: "18%", left: "61%", zIndex: 12 }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setSelectedAnatomy("femur")}
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2.5px solid #fff",
                          background: selectedAnatomy === "femur" ? "var(--primary)" : "#64748b",
                          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                      </button>
                      <div style={{ position: "absolute", top: "7px", left: "14px", width: "42px", height: "1px", background: "#cbd5e1" }} />
                      <div
                        onClick={() => setSelectedAnatomy("femur")}
                        style={{
                          position: "absolute",
                          top: "-3px",
                          left: "62px",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: selectedAnatomy === "femur" ? "var(--primary)" : "var(--text-main)",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                      >
                        Femur
                      </div>
                      {selectedAnatomy === "femur" && <div className="pulse-ripple" />}
                    </div>
                  </div>

                  {/* Patella Pin */}
                  <div style={{ position: "absolute", top: "29%", left: "60%", zIndex: 12 }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setSelectedAnatomy("patella")}
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2.5px solid #fff",
                          background: selectedAnatomy === "patella" ? "var(--primary)" : "#64748b",
                          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                      </button>
                      <div style={{ position: "absolute", top: "7px", left: "14px", width: "46px", height: "1px", background: "#cbd5e1" }} />
                      <div
                        onClick={() => setSelectedAnatomy("patella")}
                        style={{
                          position: "absolute",
                          top: "-3px",
                          left: "66px",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: selectedAnatomy === "patella" ? "var(--primary)" : "var(--text-main)",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                      >
                        Patella
                      </div>
                      {selectedAnatomy === "patella" && <div className="pulse-ripple" />}
                    </div>
                  </div>

                  {/* Lateral Meniscus Pin */}
                  <div style={{ position: "absolute", top: "41%", left: "63%", zIndex: 12 }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setSelectedAnatomy("lateral")}
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2.5px solid #fff",
                          background: selectedAnatomy === "lateral" ? "#10b981" : "#64748b",
                          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                      </button>
                      <div style={{ position: "absolute", top: "7px", left: "14px", width: "32px", height: "1px", background: "#cbd5e1" }} />
                      <div
                        onClick={() => setSelectedAnatomy("lateral")}
                        style={{
                          position: "absolute",
                          top: "-12px",
                          left: "52px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>Lateral Meniscus</span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", marginTop: "1px" }}>3.1 mm</span>
                      </div>
                      {selectedAnatomy === "lateral" && <div className="pulse-ripple" style={{ border: "2px solid #10b981" }} />}
                    </div>
                  </div>

                  {/* Medial Meniscus Pin */}
                  <div style={{ position: "absolute", top: "52%", left: "62%", zIndex: 12 }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setSelectedAnatomy("medial")}
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2.5px solid #fff",
                          background: selectedAnatomy === "medial" ? "#7c3aed" : "#64748b",
                          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                      </button>
                      <div style={{ position: "absolute", top: "7px", left: "14px", width: "36px", height: "1px", background: "#cbd5e1" }} />
                      <div
                        onClick={() => setSelectedAnatomy("medial")}
                        style={{
                          position: "absolute",
                          top: "-12px",
                          left: "56px",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>Medial Meniscus</span>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#7c3aed", marginTop: "1px" }}>3.4 mm</span>
                      </div>
                      {selectedAnatomy === "medial" && <div className="pulse-ripple" style={{ border: "2px solid #7c3aed" }} />}
                    </div>
                  </div>

                  {/* Tibia Pin */}
                  <div style={{ position: "absolute", top: "67%", left: "53%", zIndex: 12 }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setSelectedAnatomy("tibia")}
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2.5px solid #fff",
                          background: selectedAnatomy === "tibia" ? "var(--primary)" : "#64748b",
                          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#fff" }} />
                      </button>
                      <div style={{ position: "absolute", top: "7px", left: "14px", width: "74px", height: "1px", background: "#cbd5e1" }} />
                      <div
                        onClick={() => setSelectedAnatomy("tibia")}
                        style={{
                          position: "absolute",
                          top: "-3px",
                          left: "94px",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: selectedAnatomy === "tibia" ? "var(--primary)" : "var(--text-main)",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                      >
                        Tibia
                      </div>
                      {selectedAnatomy === "tibia" && <div className="pulse-ripple" />}
                    </div>
                  </div>
                </>
              )}

              {/* Dynamic descriptive floating info box card overlay */}
              {selectedAnatomy && (
                <div
                  style={{
                    position: "absolute",
                    top: "16px",
                    left: "80px",
                    right: "16px",
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(6px)",
                    border: "1.5px solid var(--primary)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    boxShadow: "0 8px 24px rgba(79, 70, 229, 0.18)",
                    zIndex: 20,
                    animation: "slideInFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Sparkles size={13} /> {anatomyDetails[selectedAnatomy].title}
                    </span>
                    <button
                      onClick={() => setSelectedAnatomy(null)}
                      style={{ border: "none", background: "none", cursor: "pointer", fontSize: "11px", color: "#64748b", fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                  <p style={{ fontSize: "11px", color: "#475569", margin: 0, lineHeight: "1.4" }}>
                    {anatomyDetails[selectedAnatomy].description}
                  </p>
                  <div style={{ fontSize: "10.5px", fontWeight: 800, color: "#1e1b4b", marginTop: "4px" }}>
                    {anatomyDetails[selectedAnatomy].metrics}
                  </div>
                </div>
              )}

              {/* View Angles (Bottom Center Tabs) */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(6px)",
                  padding: "3px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  zIndex: 10,
                }}
              >
                {(["front", "side", "top", "45"] as const).map((angle) => (
                  <button
                    key={angle}
                    onClick={() => setViewAngle(angle)}
                    style={{
                      border: "none",
                      background: viewAngle === angle ? "var(--primary)" : "transparent",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textTransform: "capitalize",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {angle === "45" ? "45°" : angle}
                  </button>
                ))}
              </div>

              {/* Reset View & Fullscreen Indicators */}
              <div
                style={{
                  position: "absolute",
                  bottom: "12px",
                  right: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  zIndex: 10,
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: "10px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "rgba(15,23,42,0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                  }}
                  onClick={() => {
                    setViewAngle("front");
                    setSelectedAnatomy(null);
                  }}
                >
                  Reset View
                </button>
                <button
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "6px",
                    background: "rgba(15,23,42,0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => alert("Zooming full view window...")}
                >
                  <Maximize2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Measurements Sidebar Panel */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "20px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className="card-title">Measurements</h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: "pointer",
                background: "var(--bg-app)",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
              }}
            >
              <span>mm</span>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Meniscus Thickness Sub-Cards */}
          <div style={{ marginBottom: "20px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
              Meniscus Thickness
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <div
                style={{
                  background: selectedAnatomy === "lateral" ? "rgba(16,185,129,0.08)" : "var(--bg-app)",
                  border: selectedAnatomy === "lateral" ? "1px solid #10b981" : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setSelectedAnatomy("lateral")}
              >
                <div style={{ fontSize: "10px", color: selectedAnatomy === "lateral" ? "#10b981" : "var(--text-light)" }}>Anterior</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: selectedAnatomy === "lateral" ? "#10b981" : "var(--text-main)", marginTop: "2px" }}>3.2 mm</div>
              </div>
              <div
                style={{
                  background: selectedAnatomy === "medial" ? "rgba(124,58,237,0.08)" : "var(--primary-light)",
                  border: selectedAnatomy === "medial" ? "1.5px solid #7c3aed" : "1px solid var(--primary)",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setSelectedAnatomy("medial")}
              >
                <div style={{ fontSize: "10px", color: selectedAnatomy === "medial" ? "#7c3aed" : "var(--primary)" }}>Middle</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: selectedAnatomy === "medial" ? "#7c3aed" : "var(--primary)", marginTop: "2px" }}>3.4 mm</div>
              </div>
              <div
                style={{
                  background: selectedAnatomy === "lateral" ? "rgba(16,185,129,0.08)" : "var(--bg-app)",
                  border: selectedAnatomy === "lateral" ? "1px solid #10b981" : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => setSelectedAnatomy("lateral")}
              >
                <div style={{ fontSize: "10px", color: selectedAnatomy === "lateral" ? "#10b981" : "var(--text-light)" }}>Posterior</div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: selectedAnatomy === "lateral" ? "#10b981" : "var(--text-main)", marginTop: "2px" }}>3.1 mm</div>
              </div>
            </div>
          </div>

          {/* Metric Rows with highlight feedback linked to selectedAnatomy */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            {[
              { id: "femur", label: "Femoral Width", value: "72.4 mm", highlight: selectedAnatomy === "femur" },
              { id: "femur", label: "Femoral AP", value: "52.6 mm", highlight: selectedAnatomy === "femur" },
              { id: "tibia", label: "Tibial Width", value: "61.8 mm", highlight: selectedAnatomy === "tibia" },
              { id: "tibia", label: "Tibial AP", value: "41.2 mm", highlight: selectedAnatomy === "tibia" },
              { id: "alignment", label: "Mechanical Axis", value: "2.1° Varus", highlight: selectedAnatomy === "patella", color: "#7c3aed" },
              { id: "alignment", label: "Limb Alignment", value: "Normal", highlight: selectedAnatomy === "patella", badge: "badge-success" },
            ].map((metric, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  background: metric.highlight ? "var(--primary-light)" : "transparent",
                  border: metric.highlight ? "1px solid rgba(79, 70, 229, 0.2)" : "none",
                  borderBottom: metric.highlight ? "1px solid rgba(79, 70, 229, 0.2)" : (idx === 5 ? "none" : "1px solid var(--border-light)"),
                  transition: "all 0.25s ease",
                }}
              >
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {metric.label}
                </span>
                {metric.badge ? (
                  <span className={`badge ${metric.badge}`} style={{ fontSize: "11px", fontWeight: 700 }}>
                    {metric.value}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: metric.color ? metric.color : "var(--text-main)",
                    }}
                  >
                    {metric.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Bottom View Report Link */}
          <button
            onClick={() => navigate("/analysis/results")}
            style={{
              width: "100%",
              border: "none",
              background: "var(--primary-light)",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "13px",
              padding: "12px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              marginTop: "16px",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "var(--primary)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "var(--primary-light)";
              e.currentTarget.style.color = "var(--primary)";
            }}
          >
            <span>View Full Report</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Row: Interactive Trend Line Chart & AI Insight Card */}
      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "24px" }}>
        
        {/* Trend Line Chart */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "20px" }}>
          <div className="card-header" style={{ marginBottom: "8px" }}>
            <div>
              <h2 className="card-title">Meniscus Thickness Trend (Avg)</h2>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                Interactive longitudinal chondral thickness progression (mm)
              </p>
            </div>
          </div>
          <InteractiveTrendChart onDataChange={(newAvg) => setAvgThickness(newAvg)} />
        </div>

        {/* AI Insight Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", padding: "20px" }}>
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Sparkles size={16} color="var(--primary)" /> AI Insight
          </h3>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "var(--bg-app)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              Meniscus thickness is within normal range. Continue monitoring for better outcomes.
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderTop: "1px solid var(--border)",
                paddingTop: "12px",
                marginTop: "16px",
              }}
            >
              <TrendingUp size={16} color="var(--primary)" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                Reference Range: 2.5 – 4.5 mm
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Styled Animations for Touch Ripple & popovers */}
      <style>{`
        @keyframes pulseTouch {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .pulse-ripple {
          position: absolute;
          top: -9px;
          left: -9px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--primary);
          animation: pulseTouch 1.2s infinite ease-out;
          pointer-events: none;
        }
        @keyframes slideInFade {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};