import React, { useState, useRef, useMemo } from "react";
import {
  BarChart2,
  TrendingUp,
  Activity,
  Calendar,
} from "lucide-react";

export interface DataPoint {
  month: string;
  value: number; // in mm
}

interface InteractiveTrendChartProps {
  initialData?: DataPoint[];
  onDataChange?: (newAvg: number, data: DataPoint[]) => void;
}

export const InteractiveTrendChart: React.FC<InteractiveTrendChartProps> = ({
  initialData = [
    { month: "Jan", value: 2.0 },
    { month: "Feb", value: 3.0 },
    { month: "Mar", value: 3.2 },
    { month: "Apr", value: 3.1 },
    { month: "May", value: 3.9 },
    { month: "Jun", value: 4.6 },
    { month: "Jul", value: 4.3 },
    { month: "Aug", value: 3.5 },
    { month: "Sep", value: 2.3 },
    { month: "Oct", value: 4.8 },
  ],
}) => {
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [timeframe, setTimeframe] = useState<"6M" | "1Y" | "All">("All");
  const [hoverState, setHoverState] = useState<{
    x: number;
    y: number;
    val: number;
    month: string;
    index: number;
    isExact: boolean;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Filter based on timeframe (fixed clinical dataset)
  const activeData = useMemo(() => {
    if (timeframe === "6M") return initialData.slice(-6);
    if (timeframe === "1Y") return initialData.slice(-10);
    return initialData;
  }, [initialData, timeframe]);

  // Dimensions
  const width = 580;
  const height = 200;
  const padding = { top: 25, right: 30, bottom: 35, left: 35 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const minVal = 0;
  const maxVal = 6; // Fixed 0 to 6mm clinical scale

  // Coordinates helper
  const getX = (index: number) => {
    const step = innerWidth / (activeData.length - 1 || 1);
    return padding.left + index * step;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    const ratio = (clamped - minVal) / (maxVal - minVal);
    return padding.top + innerHeight * (1 - ratio);
  };

  // Fixed anchor points coordinates
  const points = useMemo(() => {
    return activeData.map((d, i) => ({
      x: getX(i),
      y: getY(d.value),
      value: d.value,
      month: d.month,
    }));
  }, [activeData]);

  // Smooth Natural Cubic Spline Calculation
  const splinePath = useMemo(() => {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  }, [points]);

  // Area Fill Path
  const areaPath = useMemo(() => {
    if (!splinePath || points.length === 0) return "";
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const baselineY = padding.top + innerHeight;
    return `${splinePath} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;
  }, [splinePath, points]);

  // Continuous Smooth Scrubbing Handler (not by discrete points)
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || points.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    // Clamp within chart boundaries
    const clampedX = Math.max(points[0].x, Math.min(points[points.length - 1].x, svgX));

    // Find interval [i, i+1]
    const step = innerWidth / (points.length - 1);
    const floatIdx = (clampedX - padding.left) / step;
    const lowerIdx = Math.floor(floatIdx);
    const upperIdx = Math.min(points.length - 1, lowerIdx + 1);
    const t = floatIdx - lowerIdx;

    // Smooth cubic Hermite / Bezier interpolation for continuous height Y
    const p0 = points[lowerIdx === 0 ? 0 : lowerIdx - 1];
    const p1 = points[lowerIdx];
    const p2 = points[upperIdx];
    const p3 = points[upperIdx + 1 >= points.length ? points.length - 1 : upperIdx + 1];

    // Tangents
    const m1 = (p2.y - p0.y) / 2;
    const m2 = (p3.y - p1.y) / 2;

    // Cubic Hermite basis functions
    const h00 = (1 + 2 * t) * (1 - t) * (1 - t);
    const h10 = t * (1 - t) * (1 - t);
    const h01 = t * t * (3 - 2 * t);
    const h11 = t * t * (t - 1);

    const interpolatedY = h00 * p1.y + h10 * m1 + h01 * p2.y + h11 * m2;
    const valRatio = 1 - (interpolatedY - padding.top) / innerHeight;
    const interpolatedVal = Math.round((minVal + valRatio * (maxVal - minVal)) * 10) / 10;

    const closestIdx = Math.round(floatIdx);
    const currentMonth = points[closestIdx] ? points[closestIdx].month : "Telemetry";

    setHoverState({
      x: clampedX,
      y: interpolatedY,
      val: interpolatedVal,
      month: currentMonth,
      index: closestIdx,
      isExact: Math.abs(clampedX - points[closestIdx].x) < 4,
    });
  };

  const handleMouseLeave = () => {
    setHoverState(null);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Top Controls Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          gap: "8px",
        }}
      >
        {/* Timeframe Presets */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--primary-subtle)",
            padding: "3px",
            borderRadius: "8px",
            border: "1px solid var(--border)",
          }}
        >
          {(["6M", "1Y", "All"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                border: "none",
                background: timeframe === tf ? "var(--bg-surface)" : "transparent",
                color: timeframe === tf ? "var(--primary)" : "var(--text-muted)",
                fontWeight: timeframe === tf ? 700 : 500,
                fontSize: "11px",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: timeframe === tf ? "var(--shadow-xs)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* View Mode: Line / Bar */}
        <button
          onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
          className="btn btn-secondary btn-sm"
          style={{ padding: "4px 10px", fontSize: "11px", height: "28px" }}
          title={chartType === "line" ? "Switch to Bar View" : "Switch to Smooth Line View"}
        >
          {chartType === "line" ? <BarChart2 size={13} /> : <TrendingUp size={13} />}
          <span>{chartType === "line" ? "Bar View" : "Line View"}</span>
        </button>
      </div>

      {/* Main SVG Graph Container */}
      <div
        style={{
          position: "relative",
          background: "var(--bg-surface)",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          padding: "8px 12px 14px",
          boxShadow: "var(--shadow-xs)",
          overflow: "hidden",
        }}
      >
        {/* Unit Label */}
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>(mm)</div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            cursor: "crosshair",
            userSelect: "none",
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Smooth Spline Area Gradient */}
            <linearGradient id="smoothAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.32" />
              <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
            </linearGradient>

            {/* Bar Gradient */}
            <linearGradient id="smoothBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.75" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-Axis Scale (6, 4, 2, 0) */}
          {[6, 4, 2, 0].map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fontSize="11"
                  fill="var(--text-muted)"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Line Mode: Smooth Spline and Gradient Area */}
          {chartType === "line" && (
            <>
              {/* Soft Area Gradient Under Curve */}
              <path d={areaPath} fill="url(#smoothAreaGradient)" />

              {/* Glowing Spline Stroke */}
              <path
                d={splinePath}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: "drop-shadow(0 2px 8px rgba(99, 102, 241, 0.35))",
                }}
              />

              {/* Fixed Key Data Markers */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="4.5"
                  fill="var(--primary)"
                  stroke="var(--bg-surface)"
                  strokeWidth="2.5"
                  style={{
                    transition: "r 0.15s ease",
                  }}
                />
              ))}
            </>
          )}

          {/* Bar Mode: Vertical Clinical Pillars */}
          {chartType === "bar" &&
            points.map((p, idx) => {
              const barWidth = Math.max(14, (innerWidth / points.length) * 0.45);
              const baselineY = padding.top + innerHeight;
              const barHeight = baselineY - p.y;
              const isHovered = hoverState && hoverState.index === idx;

              return (
                <g key={idx}>
                  <rect
                    x={p.x - barWidth / 2}
                    y={p.y}
                    width={barWidth}
                    height={barHeight}
                    rx="5"
                    fill={isHovered ? "var(--primary)" : "url(#smoothBarGradient)"}
                    style={{
                      transition: "fill 0.2s ease",
                    }}
                  />
                  <text
                    x={p.x}
                    y={p.y - 6}
                    fontSize="10"
                    fill="var(--text-main)"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {p.value}
                  </text>
                </g>
              );
            })}

          {/* Continuous Smooth Hover Crosshair & Scrubbing Indicator */}
          {hoverState && (
            <g style={{ pointerEvents: "none" }}>
              {/* Vertical Laser Guideline */}
              <line
                x1={hoverState.x}
                y1={padding.top}
                x2={hoverState.x}
                y2={padding.top + innerHeight}
                stroke="var(--primary)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.85"
              />

              {/* Glowing Scrubbing Ball */}
              <circle
                cx={hoverState.x}
                cy={hoverState.y}
                r="10"
                fill="var(--primary)"
                opacity="0.25"
              />
              <circle
                cx={hoverState.x}
                cy={hoverState.y}
                r="5.5"
                fill="var(--bg-surface)"
                stroke="var(--primary)"
                strokeWidth="3"
                style={{
                  filter: "drop-shadow(0 0 6px rgba(99, 102, 241, 0.7))",
                }}
              />
            </g>
          )}

          {/* Month Axis Labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={padding.top + innerHeight + 18}
              fontSize="11"
              fill={hoverState && hoverState.index === idx ? "var(--primary)" : "var(--text-muted)"}
              fontWeight={hoverState && hoverState.index === idx ? "700" : "500"}
              textAnchor="middle"
            >
              {p.month}
            </text>
          ))}
        </svg>

        {/* Floating Glassmorphic Continuous Tooltip */}
        {hoverState && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: `${Math.min(78, Math.max(22, (hoverState.x / width) * 100))}%`,
              transform: "translateX(-50%)",
              background: "var(--bg-surface-glass)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "7px 12px",
              boxShadow: "var(--shadow-md)",
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: "fadeInTooltip 0.12s ease-out",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>
                {hoverState.month} Reading
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--primary)", lineHeight: 1.1 }}>
                {hoverState.val} mm
              </div>
            </div>
            <span
              className={`badge ${hoverState.val >= 3.0 ? "badge-success" : "badge-warning"}`}
              style={{ fontSize: "10px", padding: "3px 7px" }}
            >
              {hoverState.val >= 3.0 ? "Normal" : "Thinning"}
            </span>
          </div>
        )}
      </div>

      {/* Clean Clinical Footer Indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "8px",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Activity size={12} color="var(--primary)" /> Continuous chondral thickness telemetry
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Calendar size={12} /> Reference Target: 2.5 – 4.5 mm
        </span>
      </div>
    </div>
  );
};
