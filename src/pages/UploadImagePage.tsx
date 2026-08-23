import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  File,
  Sparkles,
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  Download,
  Activity,
  Layers,
  Clock,
  Ruler,
  ShieldCheck,
  RotateCw,
} from "lucide-react";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { scanApi, SingleImageAnalysisResponse } from "../lib/api";

export const UploadImagePage: React.FC = () => {
  const navigate = useNavigate();

  // Uploaded file state
  const [actualFile, setActualFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Enhancement controls
  const [enhancement, setEnhancement] = useState({
    enabled: true,
    contrast: true,
    clahe: true,
    denoise: true,
    sharpen: false,
    clahe_clip_limit: 2.0,
  });

  // Physical calibration input
  const [pixelSpacing, setPixelSpacing] = useState<string>("");

  // Preview & Analysis states
  const [enhancedPreviewUrl, setEnhancedPreviewUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SingleImageAnalysisResponse | null>(null);
  const [activeViewTab, setActiveViewTab] = useState<"overlay" | "enhanced" | "mask" | "original">("overlay");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileSelect = (f: File) => {
    setActualFile(f);
    setFilePreviewUrl(URL.createObjectURL(f));
    setEnhancedPreviewUrl(null);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const handlePreviewEnhancement = async () => {
    if (!actualFile) return;
    setIsPreviewing(true);
    setErrorMessage(null);
    try {
      const res = await scanApi.enhancePreview(actualFile, enhancement);
      setEnhancedPreviewUrl(res.enhanced_url);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate enhancement preview.");
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!actualFile) return;
    setErrorMessage(null);
    const spacingNum = pixelSpacing.trim() ? parseFloat(pixelSpacing) : undefined;
    try {
      const res = await scanApi.analyzeSingle(actualFile, enhancement, spacingNum);
      setAnalysisResult(res);
      setActiveViewTab("overlay");
    } catch (err: any) {
      setErrorMessage(err?.message || "Analysis failed on uploaded image.");
    }
  };

  const getQualityBadge = (status?: string) => {
    if (status === "VALID") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(22, 163, 74, 0.15)",
            color: "#22c55e",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={13} /> VALID QUALITY
        </span>
      );
    }
    if (status === "VALID_WITH_WARNING") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(234, 179, 8, 0.15)",
            color: "#eab308",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <AlertTriangle size={13} /> VALID WITH WARNING
        </span>
      );
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(239, 68, 68, 0.15)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          padding: "4px 10px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 700,
        }}
      >
        <AlertCircle size={13} /> INVALID SEGMENTATION
      </span>
    );
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      <div className="page-header">
        <h1 className="page-title">KneeAI Single-Image Analyzer</h1>
        <p className="page-subtitle">
          Direct Upload → Adaptive Enhancement → Aspect-Preserving V2 Inference → Native JSW Profiling
        </p>
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid: Left Upload & Settings | Right Live Preview & Output */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: "24px", alignItems: "start" }}>
        
        {/* Left Column: Upload & Enhancement Configuration */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Dropzone Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">1. Upload Knee Image</h2>
            </div>

            <div
              className={`upload-dropzone ${isDragOver ? "dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files.length > 0) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = ".png,.jpg,.jpeg,.tif,.tiff,.bmp,.dcm,.dicom";
                input.onchange = (e: any) => {
                  if (e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                };
                input.click();
              }}
              style={{ padding: "30px 20px" }}
            >
              <div className="dropzone-icon-circle">
                <UploadCloud size={30} />
              </div>

              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>
                Drag & Drop Knee Radiograph
              </h3>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                PNG, JPEG, TIFF, BMP, or DICOM (Any resolution & aspect ratio)
              </p>

              <button type="button" className="btn btn-secondary btn-sm" style={{ pointerEvents: "none" }}>
                Select Image File
              </button>
            </div>

            {actualFile && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 14px",
                  background: "var(--primary-light)",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <File size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                      {actualFile.name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {(actualFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for pipeline
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                  onClick={() => {
                    setActualFile(null);
                    setFilePreviewUrl(null);
                    setEnhancedPreviewUrl(null);
                    setAnalysisResult(null);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Enhancement Configuration Card */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={16} color="var(--primary)" /> 2. Image Enhancement
              </h2>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={enhancement.enabled}
                  onChange={(e) => setEnhancement({ ...enhancement, enabled: e.target.checked })}
                />
                Enable Filter
              </label>
            </div>

            <div style={{ opacity: enhancement.enabled ? 1 : 0.4, pointerEvents: enhancement.enabled ? "auto" : "none", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Robust Percentile Contrast</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Normalize dynamic range (1%-99% intensity)</div>
                </div>
                <input
                  type="checkbox"
                  checked={enhancement.contrast}
                  onChange={(e) => setEnhancement({ ...enhancement, contrast: e.target.checked })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Adaptive Histogram (CLAHE)</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Enhance bone-cartilage interfaces locally</div>
                </div>
                <input
                  type="checkbox"
                  checked={enhancement.clahe}
                  onChange={(e) => setEnhancement({ ...enhancement, clahe: e.target.checked })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Boundary-Preserving Denoising</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Smooth high-frequency sensor noise</div>
                </div>
                <input
                  type="checkbox"
                  checked={enhancement.denoise}
                  onChange={(e) => setEnhancement({ ...enhancement, denoise: e.target.checked })}
                />
              </div>
            </div>

            {/* Optional Physical Calibration Input */}
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Ruler size={13} color="var(--primary)" /> Optional Pixel Spacing (mm/pixel)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 0.14 (Leave empty for pixel-only metrics)"
                className="form-input"
                value={pixelSpacing}
                onChange={(e) => setPixelSpacing(e.target.value)}
                style={{ fontSize: "12px" }}
              />
              <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                If unspecified, measurements are strictly reported in exact pixels without conversion.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
                disabled={!actualFile || isPreviewing}
                onClick={handlePreviewEnhancement}
              >
                {isPreviewing ? "Enhancing..." : "Preview Enhanced"}
              </button>

              <AnimatedButton
                loadingText="Running V2 AI Inference..."
                successText="Analysis Complete!"
                disabled={!actualFile}
                onClick={handleRunAnalysis}
                icon={<Sparkles size={14} />}
                style={{ flex: 1.5, borderRadius: "8px" }}
              >
                Analyze Image
              </AnimatedButton>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Visualizer & Analysis Output */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Main Visualizer Card */}
          <div className="card" style={{ minHeight: "420px", display: "flex", flexDirection: "column" }}>
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={16} color="var(--primary)" /> Visual Output
              </h2>

              {/* View Tabs */}
              {analysisResult && (
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeViewTab === "overlay" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveViewTab("overlay")}
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                  >
                    Overlay + JSW
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeViewTab === "enhanced" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveViewTab("enhanced")}
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                  >
                    Enhanced
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeViewTab === "mask" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveViewTab("mask")}
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                  >
                    Native Mask
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeViewTab === "original" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setActiveViewTab("original")}
                    style={{ fontSize: "11px", padding: "4px 8px" }}
                  >
                    Original
                  </button>
                </div>
              )}
            </div>

            {/* Display Area */}
            <div
              style={{
                flex: 1,
                borderRadius: "10px",
                background: "#000000",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                minHeight: "340px",
                position: "relative",
              }}
            >
              {analysisResult ? (
                <img
                  src={
                    activeViewTab === "overlay"
                      ? analysisResult.segmentation.overlay_url
                      : activeViewTab === "enhanced"
                      ? analysisResult.segmentation.enhanced_url
                      : activeViewTab === "mask"
                      ? analysisResult.segmentation.mask_url
                      : filePreviewUrl || analysisResult.segmentation.original_url
                  }
                  alt="Knee Analysis Result"
                  style={{ maxWidth: "100%", maxHeight: "460px", objectFit: "contain", display: "block" }}
                />
              ) : enhancedPreviewUrl ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", height: "100%", gap: "8px", padding: "8px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Original</div>
                    <img src={filePreviewUrl!} alt="Original" style={{ maxHeight: "300px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "var(--primary)", marginBottom: "4px" }}>Enhanced (CLAHE+Denoise)</div>
                    <img src={enhancedPreviewUrl} alt="Enhanced" style={{ maxHeight: "300px", maxWidth: "100%", objectFit: "contain" }} />
                  </div>
                </div>
              ) : filePreviewUrl ? (
                <img
                  src={filePreviewUrl}
                  alt="Original Preview"
                  style={{ maxWidth: "100%", maxHeight: "360px", objectFit: "contain", display: "block" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
                  <Layers size={36} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
                  <p style={{ fontSize: "13px" }}>Upload a knee radiograph to view live enhancement and analysis.</p>
                </div>
              )}
            </div>
          </div>

          {/* Analysis Results Panel */}
          {analysisResult && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 className="card-title" style={{ fontSize: "15px" }}>Anatomical Measurements & QC</h3>
                {getQualityBadge(analysisResult.quality_control.status)}
              </div>

              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Median JSW</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--primary)" }}>
                    {analysisResult.measurements.jsw_median_mm
                      ? `${analysisResult.measurements.jsw_median_mm} mm`
                      : `${analysisResult.measurements.jsw_median_px ?? "N/A"} px`}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {analysisResult.measurements.jsw_median_mm ? `(${analysisResult.measurements.jsw_median_px} px)` : "Uncalibrated"}
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Min / Max JSW</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", marginTop: "3px" }}>
                    {analysisResult.measurements.jsw_min_px ?? "—"} / {analysisResult.measurements.jsw_max_px ?? "—"} px
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {analysisResult.measurements.jsw_min_mm ? `${analysisResult.measurements.jsw_min_mm} - ${analysisResult.measurements.jsw_max_mm} mm` : "Pixel space"}
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Joint Area</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                    {analysisResult.segmentation.area_pixels.toLocaleString()} px
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {analysisResult.segmentation.area_percentage}% of radiograph
                  </div>
                </div>

                <div style={{ background: "var(--bg-secondary)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Inference Time</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#22c55e", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={12} /> {analysisResult.processing.inference_time_ms} ms
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    Total: {analysisResult.processing.total_time_ms} ms
                  </div>
                </div>
              </div>

              {/* Native Dimensions & Transform Information */}
              <div style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <span>Native Resolution: <strong>{analysisResult.original_image.width} × {analysisResult.original_image.height}</strong></span>
                <span>Letterbox Scale: <strong>{analysisResult.preprocessing.letterbox_scale}</strong></span>
                <span>JSW Samples: <strong>{analysisResult.measurements.sample_count} columns</strong></span>
                <span>Unit: <strong>{analysisResult.calibration.unit}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};