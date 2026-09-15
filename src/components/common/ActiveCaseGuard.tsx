import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAnalysisStore } from "../../store/analysisStore";

interface ActiveCaseGuardProps {
  children?: React.ReactNode;
  requireAnalysisResult?: boolean;
}

export const ActiveCaseGuard: React.FC<ActiveCaseGuardProps> = ({
  children,
  requireAnalysisResult = false,
}) => {
  const activeCase = useAnalysisStore((state) => state.activeCase);
  const activeCaseId = useAnalysisStore((state) => state.activeCaseId);
  const views = useAnalysisStore((state) => state.views);

  const hasCase = Boolean(activeCaseId || activeCase?.caseId);
  const hasAnalysis = Boolean(
    activeCase?.analysisResult ||
      views?.front?.analysisResult ||
      views?.side?.analysisResult ||
      views?.top?.analysisResult
  );

  const hasUploadedFile = Boolean(
    activeCase?.uploadedFile ||
      views?.front?.file ||
      views?.front?.filePreviewUrl ||
      views?.side?.file ||
      views?.side?.filePreviewUrl
  );

  // If case requires completed analysis result
  if (requireAnalysisResult && !hasAnalysis) {
    return <Navigate to="/analysis/upload" replace />;
  }

  // If case requires at least an active uploaded scan or active case
  if (!hasCase && !hasUploadedFile && !hasAnalysis) {
    return <Navigate to="/analysis/upload" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
