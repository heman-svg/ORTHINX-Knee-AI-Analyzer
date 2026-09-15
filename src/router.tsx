import { RouteObject, Navigate } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientRecordsPage } from "./pages/PatientRecordsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { NewPatientPage } from "./pages/NewPatientPage";
import { UploadImagePage } from "./pages/UploadImagePage";
import { AnalysisResultsPage } from "./pages/AnalysisResultsPage";
import { MeniscusAnalysisPage } from "./pages/MeniscusAnalysisPage";
import { AnatomicalMeasurementsPage } from "./pages/AnatomicalMeasurementsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HelpPage } from "./pages/HelpPage";
import { ActiveCaseGuard } from "./components/common/ActiveCaseGuard";

const routes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "patients",
        element: <PatientRecordsPage />,
      },
      {
        path: "patients/new",
        element: <NewPatientPage />,
      },
      {
        path: "patients/:patientId",
        element: <PatientDetailPage />,
      },
      // Analysis Workflow Routes
      {
        path: "analysis/upload",
        element: <UploadImagePage />,
      },
      {
        path: "analysis/results",
        element: (
          <ActiveCaseGuard requireAnalysisResult={true}>
            <AnalysisResultsPage />
          </ActiveCaseGuard>
        ),
      },
      {
        path: "analysis/measurements",
        element: (
          <ActiveCaseGuard requireAnalysisResult={true}>
            <AnatomicalMeasurementsPage />
          </ActiveCaseGuard>
        ),
      },
      {
        path: "analysis/meniscus",
        element: (
          <ActiveCaseGuard requireAnalysisResult={true}>
            <MeniscusAnalysisPage />
          </ActiveCaseGuard>
        ),
      },
      // Output & Utilities
      {
        path: "reports",
        element: (
          <ActiveCaseGuard requireAnalysisResult={false}>
            <ReportsPage />
          </ActiveCaseGuard>
        ),
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "help",
        element: <HelpPage />,
      },
      // Fallback
      {
        path: "*",
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
];

export default routes;