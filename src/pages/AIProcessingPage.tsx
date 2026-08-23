import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Circle, Sparkles, ArrowRight, Shield, Activity, Target, Cpu } from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";

// Import medical assets
import kneeMri from "../assets/knee_mri.jpg";
import kneeSegmented from "../assets/knee_segmented.jpg";
import femurMeasurement from "../assets/femur_measurement.png";
import tibiaMeasurement from "../assets/tibia_measurement.png";

export const AIProcessingPage: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sliceNum, setSliceNum] = useState(1);

  const steps = [
    { label: "Image Validation & DICOM Header Parse", threshold: 15 },
    { label: "Contrast Normalization & Denoising", threshold: 35 },
    { label: "Femur & Tibia Deep Segmentation", threshold: 60 },
    { label: "Meniscus 3D Chondral Surface Mapping", threshold: 80 },
    { label: "A-M-P Thickness Measurement Extraction", threshold: 95 },
    { label: "Implant System Matching & Results Generation", threshold: 100 },
  ];

  // Simulated slice counting
  useEffect(() => {
    if (progress >= 100) return;
    const interval = setInterval(() => {
      setSliceNum((prev) => (prev >= 512 ? 1 : prev + Math.floor(Math.random() * 8) + 4));
    }, 80);
    return () => clearInterval(interval);
  }, [progress]);

  // Main progress simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCompleted(true);
          return 100;
        }
        return prev + 2; // steady loading
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  // Determine current image based on active phase
  const getCurrentImage = () => {
    if (progress < 20) return kneeMri;
    if (progress < 50) return kneeSegmented;
    if (progress < 75) return femurMeasurement;
    if (progress < 90) return tibiaMeasurement;
    return kneeSegmented;
  };

  const getPhaseName = () => {
    if (progress < 20) return "VALIDATING RAW DICOM";
    if (progress < 50) return "SEGMENTING ARTICULAR SURFACES";
    if (progress < 75) return "MAPPING FEMORAL BOUNDARIES";
    if (progress < 90) return "CALCULATING TIBIAL PLATEAU";
    return "RECONSTRUCTING 3D GEOMETRY";
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AI Processing Engine</h1>
        <p className="page-subtitle">Deep learning anatomical reconstruction and quantitative sizing</p>
      </div>

      <div className="processing-card" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "40px", alignItems: "stretch" }}>
        {/* Left Column: AI Medical Imaging Scanner */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
          
          {/* Scanner Viewfinder Box */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "400px",
              height: "280px",
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--bg-dark-mri)",
              boxShadow: "0 12px 30px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(91, 75, 255, 0.15)",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Medical scan image fitted to the box */}
            <img
              src={getCurrentImage()}
              alt="Scan Processing"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.85,
                transition: "all 0.3s ease-in-out",
              }}
            />

            {/* Glowing laser scanning horizontal line */}
            {!isCompleted && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  width: "100%",
                  height: "2px",
                  background: "linear-gradient(90deg, transparent, #a855f7, #4f46e5, #a855f7, transparent)",
                  boxShadow: "0 0 10px #7c3aed, 0 0 20px #4f46e5",
                  animation: "scanLineAnim 2.5s infinite linear",
                  zIndex: 5,
                }}
              />
            )}

            {/* Holographic Crosshair Overlay */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                border: "1px solid rgba(79, 70, 229, 0.2)",
                margin: "12px",
                pointerEvents: "none",
                zIndex: 6,
              }}
            >
              {/* Corner brackets */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "10px", height: "10px", borderTop: "2px solid #a855f7", borderLeft: "2px solid #a855f7" }} />
              <div style={{ position: "absolute", top: 0, right: 0, width: "10px", height: "10px", borderTop: "2px solid #a855f7", borderRight: "2px solid #a855f7" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, width: "10px", height: "10px", borderBottom: "2px solid #a855f7", borderLeft: "2px solid #a855f7" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "10px", height: "10px", borderBottom: "2px solid #a855f7", borderRight: "2px solid #a855f7" }} />
            </div>

            {/* AI HUD Telemetry Overlay */}
            <div
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "#10b981",
                fontFamily: "monospace",
                fontSize: "10px",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                zIndex: 7,
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <div>SYS.STATUS: <span style={{ color: "#a855f7" }}>{isCompleted ? "IDLE_COMPLETE" : "RUNNING"}</span></div>
              <div>SLICE: {isCompleted ? "512 / 512" : `${sliceNum} / 512`}</div>
              <div>RECON.PHASE: {getPhaseName()}</div>
            </div>

            <div
              style={{
                position: "absolute",
                bottom: "16px",
                right: "16px",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "monospace",
                fontSize: "10px",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                zIndex: 7,
              }}
            >
              GPU TEMP: 62°C | CONF: {(85 + progress * 0.12).toFixed(1)}%
            </div>
          </div>

          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
            {isCompleted ? "Analysis Complete!" : "Analyzing Knee MRI Series..."}
          </h2>

          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", maxWidth: "380px" }}>
            {isCompleted
              ? "Segmentation masks and dimensional metrics have been computed successfully."
              : "Running neural networks on 512×512 Sagittal MRI slices."}
          </p>

          {/* Progress Bar with Number */}
          <div style={{ width: "100%", maxWidth: "360px", marginBottom: "20px" }}>
            <div
              style={{
                height: "6px",
                borderRadius: "999px",
                background: "var(--primary-light)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, var(--primary) 0%, #7C3AED 100%)",
                  borderRadius: "999px",
                  transition: "width 0.22s ease-out",
                }}
              ></div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--primary)",
                marginTop: "6px",
              }}
            >
              <span>COMPUTING METRICS</span>
              <span>{progress}%</span>
            </div>
          </div>

          {/* Action Buttons */}
          {isCompleted ? (
            <AnimatedButton
              variant="pill"
              icon={<ArrowRight size={16} />}
              loadingText="Opening Results..."
              successText="Ready!"
              onClick={async () => {
                await new Promise((r) => setTimeout(r, 600));
              }}
              onSuccess={() => navigate("/analysis/results")}
              style={{ padding: "10px 28px" }}
            >
              View Diagnostic Results
            </AnimatedButton>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-pill"
              style={{ padding: "8px 24px", fontSize: "13px" }}
              onClick={() => navigate("/upload")}
            >
              Cancel Processing
            </button>
          )}

          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "16px", fontStyle: "italic" }}>
            *Clinical AI algorithm running in HIPAA-compliant isolated GPU environment.
          </p>
        </div>

        {/* Right Column: Processing Steps Checklist */}
        <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: "40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px" }}>
            Real-Time Processing Pipeline
          </h3>

          <div className="steps-list">
            {steps.map((step, idx) => {
              const done = progress >= step.threshold;
              const active = !done && (idx === 0 || progress >= steps[idx - 1].threshold);

              return (
                <div
                  key={step.label}
                  className={`step-item ${done ? "completed" : active ? "active" : ""}`}
                >
                  {done ? (
                    <CheckCircle2 size={18} className="step-icon-done" />
                  ) : active ? (
                    <Loader2 size={18} className="step-icon-active" />
                  ) : (
                    <Circle size={18} className="step-icon-pending" />
                  )}
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add scanning animation rules if not already in index.css */}
      <style>{`
        @keyframes scanLineAnim {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  );
};