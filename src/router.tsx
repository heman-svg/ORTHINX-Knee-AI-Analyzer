import { RouteObject } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PatientRecordsPage } from "./pages/PatientRecordsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { NewPatientPage } from "./pages/NewPatientPage";
import { UploadImagePage } from "./pages/UploadImagePage";
import { AIProcessingPage } from "./pages/AIProcessingPage";
import { AnalysisResultsPage } from "./pages/AnalysisResultsPage";
import { MeniscusAnalysisPage } from "./pages/MeniscusAnalysisPage";
import { AnatomicalMeasurementsPage } from "./pages/AnatomicalMeasurementsPage";
import { ImplantRecommendationPage } from "./pages/ImplantRecommendationPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HelpPage } from "./pages/HelpPage";

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
        element: <DashboardPage />,
      },
      {
        path: "patients",
        element: <PatientRecordsPage />,
      },
      {
        path: "patients/:id",
        element: <PatientDetailPage />,
      },
      {
        path: "patients/new",
        element: <NewPatientPage />,
      },
      // Page 1: Knee Analysis
      {
        path: "knee-analysis",
        element: <UploadImagePage />,
      },
      {
        path: "upload",
        element: <UploadImagePage />,
      },
      // Processing Engine
      {
        path: "analysis",
        element: <AIProcessingPage />,
      },
      {
        path: "analysis/results",
        element: <AnalysisResultsPage />,
      },
      // Page 2: Meniscus Analysis
      {
        path: "meniscus-analysis",
        element: <MeniscusAnalysisPage />,
      },
      {
        path: "analysis/meniscus",
        element: <MeniscusAnalysisPage />,
      },
      // Page 3: Anatomical Measurements
      {
        path: "anatomical-measurements",
        element: <AnatomicalMeasurementsPage />,
      },
      {
        path: "anatomical-measurements/:caseId",
        element: <AnatomicalMeasurementsPage />,
      },
      {
        path: "analysis/measurements",
        element: <AnatomicalMeasurementsPage />,
      },
      {
        path: "analysis/measurements/:caseId",
        element: <AnatomicalMeasurementsPage />,
      },
      // Implant Planning
      {
        path: "implant-planning",
        element: <ImplantRecommendationPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "help",
        element: <HelpPage />,
      },
    ],
  },
];

export default routes;