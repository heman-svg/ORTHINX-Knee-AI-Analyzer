import React, { useState } from "react";
import { Loader2, Check } from "lucide-react";

export interface AnimatedButtonProps {
  children: React.ReactNode;
  loadingText?: string;
  successText?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "pill";
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => Promise<void> | void;
  onSuccess?: () => void;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  loadingText = "Processing...",
  successText = "Completed",
  icon,
  variant = "primary",
  size = "md",
  className = "",
  style = {},
  disabled = false,
  type = "button",
  onClick,
  onSuccess,
}) => {
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || state !== "idle") return;

    if (onClick) {
      const res = onClick();
      // If it's a promise, manage the loading -> success lifecycle
      if (res && typeof (res as any).then === "function") {
        try {
          setState("loading");
          await res;
          setState("success");
          setTimeout(() => {
            setState("idle");
            if (onSuccess) onSuccess();
          }, 1100);
        } catch {
          setState("idle");
        }
      }
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case "secondary":
        return "btn btn-secondary";
      case "outline":
        return "btn btn-outline";
      case "pill":
        return "btn btn-primary btn-pill";
      default:
        return "btn btn-primary";
    }
  };

  const getSizeStyle = (): React.CSSProperties => {
    switch (size) {
      case "sm":
        return { padding: "7px 14px", fontSize: "12px" };
      case "lg":
        return { padding: "14px 32px", fontSize: "16px" };
      default:
        return { padding: "11px 24px", fontSize: "14px" };
    }
  };

  return (
    <button
      type={type}
      disabled={disabled || state === "loading"}
      onClick={handleClick}
      className={`animated-medical-btn ${getVariantClass()} ${className} ${state === "success" ? "btn-state-success" : ""} ${state === "loading" ? "btn-state-loading" : ""}`}
      style={{
        ...getSizeStyle(),
        ...style,
      }}
    >
      <span className="btn-sweep-highlight" />

      {state === "loading" && (
        <span className="btn-content-inline">
          <Loader2 size={16} className="btn-spinner-icon" />
          <span>{loadingText}</span>
        </span>
      )}

      {state === "success" && (
        <span className="btn-content-inline text-emerald-400">
          <Check size={16} className="btn-check-icon" />
          <span>{successText}</span>
        </span>
      )}

      {state === "idle" && (
        <span className="btn-content-inline">
          {icon && <span className="btn-leading-icon">{icon}</span>}
          <span>{children}</span>
        </span>
      )}
    </button>
  );
};
