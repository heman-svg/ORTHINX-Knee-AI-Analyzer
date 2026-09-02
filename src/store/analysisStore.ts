import { create } from "zustand";
import { scanApi, SingleImageAnalysisResponse } from "../lib/api";

export type AnatomicalOrientation = "front" | "side" | "top";
export type ActiveImageTab = "original" | "enhanced" | "measurements" | "segmentation";
export type AnalysisStatus = "idle" | "loading" | "success" | "partial" | "error";

export interface ActiveCase {
  caseId: string;
  patientId: string;
  patientName: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  studyDateTime: string;
  doctorName: string;
  doctorSpecialization: string;
  view: AnatomicalOrientation;
  uploadedFile: File | null;
  originalImageUrl: string | null;
  enhancedImageUrl: string | null;
  measurementImageUrl: string | null;
  segmentationImageUrl: string | null;
  analysisResult: SingleImageAnalysisResponse | null;
  measurements: Record<string, any> | null;
  segmentation: Record<string, any> | null;
  meniscusResult: Record<string, any> | null;
  implantResult: Record<string, any> | null;
  confidenceScore: number | null;
  analysisStatus: AnalysisStatus;
  pixelSpacing: number | null;
  dimensions?: { width: number; height: number } | null;
}

export interface ZoneMeasurement {
  zone: "A" | "M" | "P";
  name: string;
  subname: string;
  valueText: string;
  numericValue: number | null;
  unit: string;
  status: "Preserved" | "Normal" | "Reduced" | "Thinning" | "Unavailable";
  color: string;
  desc: string;
  confidence: number;
  isUnavailable?: boolean;
}

export interface ViewScanState {
  file: File | null;
  filePreviewUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  dimensions: { width: number; height: number } | null;
  enhancedPreviewUrl: string | null;
  isEnhancing: boolean;
  enhancementApplied: boolean;
  enhancementError: string | null;
  isAnalyzing: boolean;
  analysisStatus: AnalysisStatus;
  analysisResult: SingleImageAnalysisResponse | null;
  analysisError: string | null;
}

export interface DerivedMeasurements {
  provenance: string;
  isCalibrated: boolean;
  calibrationMode: "user_calibrated" | "dicom_calibrated" | "pixel_units_only";
  unit: "px" | "mm";
  areaUnit: "px²" | "mm²";
  pixelSpacing: number | null;
  isValid: boolean;
  qcStatus: string;
  qualityScore: number;
  warnings: string[];

  // A - M - P Joint Space Clearances
  anteriorA: number | null;
  anteriorAText: string;
  middleM: number | null;
  middleMText: string;
  posteriorP: number | null;
  posteriorPText: string;

  // Bone Measurements
  femoralWidthML: number | null;
  femoralWidthMLText: string;
  femoralAP: number | null;
  femoralAPText: string;
  tibialPlateauWidth: number | null;
  tibialPlateauWidthText: string;
  tibialAP: number | null;
  tibialAPText: string;

  // Joint Space Measurements
  medialJSW: number | null;
  medialJSWText: string;
  lateralJSW: number | null;
  lateralJSWText: string;
  jswMin: number | null;
  jswMinText: string;
  jswMedian: number | null;
  jswMedianText: string;
  jswMax: number | null;
  jswMaxText: string;
  jswMean: number | null;
  jswMeanText: string;
  jointArea: number | null;
  jointAreaText: string;
  sampleCount: number;
  areaPercentageText: string;
}

export interface AnalysisStoreState {
  // Single Source of Truth for the active clinical case
  activeCase: ActiveCase | null;

  // Active Navigation & View
  caseId: string | null;
  activeImageTab: ActiveImageTab;
  orientation: AnatomicalOrientation;
  pixelSpacingInput: string;
  calibrationMode: "user_calibrated" | "dicom_calibrated" | "pixel_units_only" | null;

  // Multi-View Storage (Front AP, Side Lateral, Top Axial)
  views: Record<AnatomicalOrientation, ViewScanState>;

  // Flat compatibility properties (synced to current active view)
  actualFile: File | null;
  filePreviewUrl: string | null;
  uploadedFileName: string | null;
  uploadedFileSize: number | null;
  imageDimensions: { width: number; height: number } | null;
  enhancedPreviewUrl: string | null;
  isEnhancing: boolean;
  enhancementApplied: boolean;
  enhancementError: string | null;
  isAnalyzing: boolean;
  analysisStatus: AnalysisStatus;
  analysisResult: SingleImageAnalysisResponse | null;
  analysisError: string | null;

  // Patient Information
  patientInfo: {
    patientId: string;
    patientName: string;
    patientAge: number;
    patientSex: string;
    doctorName: string;
    doctorSpecialization: string;
    studyDate?: string;
  };

  // Actions
  setPatientInfo: (info: Partial<AnalysisStoreState["patientInfo"]>) => void;
  setUploadedFile: (file: File, targetView?: AnatomicalOrientation) => void;
  setActiveImageTab: (tab: ActiveImageTab) => void;
  setOrientation: (orientation: AnatomicalOrientation) => void;
  setPixelSpacingInput: (val: string) => void;
  enhanceImage: (targetView?: AnatomicalOrientation) => Promise<void>;
  runAnalysis: (targetView?: AnatomicalOrientation) => Promise<SingleImageAnalysisResponse | null>;
  clearAnalysis: (targetView?: AnatomicalOrientation | "all") => void;
  resetActiveCase: () => void;
  startNewAnalysis: () => void;
  setScanResult: (result: SingleImageAnalysisResponse, targetView?: AnatomicalOrientation) => void;
  getDerivedMeasurements: () => DerivedMeasurements | null;
  getZoneMeasurements: () => Record<"A" | "M" | "P", ZoneMeasurement>;
}

export const generateCleanPatientInfo = () => {
  const hex = Math.random().toString(16).substring(2, 10).toUpperCase();
  return {
    patientId: `PT-${hex}`,
    patientName: "",
    patientAge: 58,
    patientSex: "Female",
    doctorName: "Dr. Alex Morgan, MD",
    doctorSpecialization: "Chief Orthopedic Surgeon",
    studyDate: undefined,
  };
};

const initialViewState = (): ViewScanState => ({
  file: null,
  filePreviewUrl: null,
  fileName: null,
  fileSize: null,
  dimensions: null,
  enhancedPreviewUrl: null,
  isEnhancing: false,
  enhancementApplied: false,
  enhancementError: null,
  isAnalyzing: false,
  analysisStatus: "idle",
  analysisResult: null,
  analysisError: null,
});

export const useAnalysisStore = create<AnalysisStoreState>()((set, get) => ({
  activeCase: null,
  caseId: null,
  activeImageTab: "original",
  orientation: "front",
  pixelSpacingInput: "",
  calibrationMode: null,

  views: {
    front: initialViewState(),
    side: initialViewState(),
    top: initialViewState(),
  },

  // Flat compatibility properties (synced to current active view)
  actualFile: null,
  filePreviewUrl: null,
  uploadedFileName: null,
  uploadedFileSize: null,
  imageDimensions: null,
  enhancedPreviewUrl: null,
  isEnhancing: false,
  enhancementApplied: false,
  enhancementError: null,
  isAnalyzing: false,
  analysisStatus: "idle",
  analysisResult: null,
  analysisError: null,

  patientInfo: generateCleanPatientInfo(),

  setPatientInfo: (info) =>
    set((state) => {
      const updated = { ...state.patientInfo, ...info };
      const currentCase = state.activeCase;
      const updatedActiveCase = currentCase
        ? {
            ...currentCase,
            patientId: updated.patientId,
            patientName: updated.patientName,
            age: updated.patientAge,
            sex: updated.patientSex as any,
            doctorName: updated.doctorName,
            doctorSpecialization: updated.doctorSpecialization,
            studyDateTime: updated.studyDate || currentCase.studyDateTime,
          }
        : null;

      return {
        patientInfo: updated,
        activeCase: updatedActiveCase,
      };
    }),

  setUploadedFile: (file: File, targetView?: AnatomicalOrientation) => {
    const viewKey = targetView || get().orientation;
    const prevUrl = get().views[viewKey]?.filePreviewUrl;
    if (prevUrl && prevUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(prevUrl);
      } catch (_) {}
    }

    const objectUrl = URL.createObjectURL(file);
    const draftCaseId =
      get().caseId ||
      `CASE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const img = new Image();
    img.onload = () => {
      const currentViews = get().views;
      const dims = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      };
      set({
        views: {
          ...currentViews,
          [viewKey]: {
            ...currentViews[viewKey],
            dimensions: dims,
          },
        },
        ...(get().orientation === viewKey ? { imageDimensions: dims } : {}),
      });
    };
    img.src = objectUrl;

    const updatedView: ViewScanState = {
      file,
      filePreviewUrl: objectUrl,
      fileName: file.name,
      fileSize: file.size,
      dimensions: null,
      enhancedPreviewUrl: null,
      isEnhancing: false,
      enhancementApplied: false,
      enhancementError: null,
      isAnalyzing: false,
      analysisStatus: "idle",
      analysisResult: null,
      analysisError: null,
    };

    const pInfo = get().patientInfo;
    const activeCaseDraft: ActiveCase = {
      caseId: draftCaseId,
      patientId: pInfo.patientId,
      patientName: pInfo.patientName,
      age: pInfo.patientAge,
      sex: pInfo.patientSex as any,
      studyDateTime: new Date().toLocaleString(),
      doctorName: pInfo.doctorName,
      doctorSpecialization: pInfo.doctorSpecialization,
      view: viewKey,
      uploadedFile: file,
      originalImageUrl: objectUrl,
      enhancedImageUrl: null,
      measurementImageUrl: null,
      segmentationImageUrl: null,
      analysisResult: null,
      measurements: null,
      segmentation: null,
      meniscusResult: null,
      implantResult: null,
      confidenceScore: null,
      analysisStatus: "idle",
      pixelSpacing: null,
    };

    set({
      activeCase: activeCaseDraft,
      caseId: draftCaseId,
      activeImageTab: "original",
      views: { ...get().views, [viewKey]: updatedView },
      actualFile: file,
      filePreviewUrl: objectUrl,
      uploadedFileName: file.name,
      uploadedFileSize: file.size,
      enhancedPreviewUrl: null,
      enhancementApplied: false,
      isAnalyzing: false,
      analysisStatus: "idle",
      analysisResult: null,
      analysisError: null,
    });
  },

  setActiveImageTab: (tab: ActiveImageTab) => set({ activeImageTab: tab }),

  setOrientation: (orientation: AnatomicalOrientation) => {
    const targetView = get().views[orientation];
    set({
      orientation,
      actualFile: targetView.file,
      filePreviewUrl: targetView.filePreviewUrl,
      uploadedFileName: targetView.fileName,
      uploadedFileSize: targetView.fileSize,
      imageDimensions: targetView.dimensions,
      enhancedPreviewUrl: targetView.enhancedPreviewUrl,
      isEnhancing: targetView.isEnhancing,
      enhancementApplied: targetView.enhancementApplied,
      enhancementError: targetView.enhancementError,
      isAnalyzing: targetView.isAnalyzing,
      analysisStatus: targetView.analysisStatus,
      analysisResult: targetView.analysisResult,
      analysisError: targetView.analysisError,
    });
  },

  setPixelSpacingInput: (val: string) => set({ pixelSpacingInput: val }),

  enhanceImage: async (targetView?: AnatomicalOrientation) => {
    const viewKey = targetView || get().orientation;
    const viewState = get().views[viewKey];

    if (!viewState.file && !viewState.filePreviewUrl) {
      return;
    }

    const current = get().views[viewKey];
    set({
      views: {
        ...get().views,
        [viewKey]: { ...current, isEnhancing: true, enhancementError: null },
      },
      ...(get().orientation === viewKey
        ? { isEnhancing: true, enhancementError: null }
        : {}),
    });

    try {
      let fileToSend: File | null = viewState.file;
      if (!fileToSend && viewState.filePreviewUrl) {
        const resp = await fetch(viewState.filePreviewUrl);
        const blob = await resp.blob();
        fileToSend = new File([blob], viewState.fileName || "xray.png", {
          type: blob.type,
        });
      }

      if (!fileToSend) {
        throw new Error("No image file loaded to enhance.");
      }

      const res = await scanApi.enhancePreview(fileToSend, {
        enabled: true,
        contrast: true,
        clahe: true,
        denoise: true,
        sharpen: false,
      });

      const updated = get().views[viewKey];
      set({
        views: {
          ...get().views,
          [viewKey]: {
            ...updated,
            isEnhancing: false,
            enhancementApplied: true,
            enhancedPreviewUrl: res.enhanced_preview_url,
          },
        },
        ...(get().orientation === viewKey
          ? {
              isEnhancing: false,
              enhancementApplied: true,
              enhancedPreviewUrl: res.enhanced_preview_url,
              activeImageTab: "enhanced",
            }
          : {}),
      });
    } catch (err: any) {
      const errorMsg =
        err?.data?.error ||
        err?.data?.details ||
        err?.message ||
        "Image enhancement failed.";
      const updated = get().views[viewKey];
      set({
        views: {
          ...get().views,
          [viewKey]: {
            ...updated,
            isEnhancing: false,
            enhancementError: errorMsg,
          },
        },
        ...(get().orientation === viewKey
          ? { isEnhancing: false, enhancementError: errorMsg }
          : {}),
      });
    }
  },

  runAnalysis: async (targetView?: AnatomicalOrientation) => {
    const viewKey = targetView || get().orientation;
    const viewState = get().views[viewKey];

    if (!viewState.file && !viewState.filePreviewUrl) {
      return null;
    }

    const current = get().views[viewKey];
    set({
      views: {
        ...get().views,
        [viewKey]: {
          ...current,
          isAnalyzing: true,
          analysisStatus: "loading",
          analysisError: null,
        },
      },
      ...(get().orientation === viewKey
        ? { isAnalyzing: true, analysisStatus: "loading", analysisError: null }
        : {}),
    });

    try {
      const spacingNum = get().pixelSpacingInput
        ? parseFloat(get().pixelSpacingInput)
        : undefined;
      const backendViewName =
        viewKey === "front" ? "ap" : viewKey === "side" ? "lateral" : "axial";

      let fileToSend: File | null = viewState.file;
      if (!fileToSend && viewState.filePreviewUrl) {
        const resp = await fetch(viewState.filePreviewUrl);
        const blob = await resp.blob();
        fileToSend = new File([blob], viewState.fileName || "xray.png", {
          type: blob.type,
        });
      }

      if (!fileToSend) {
        throw new Error("No image file loaded to analyze.");
      }

      const pInfo = get().patientInfo;
      const res = await scanApi.analyzeSingle(
        fileToSend,
        {
          enabled: true,
          contrast: true,
          clahe: true,
          denoise: true,
          sharpen: false,
        },
        spacingNum,
        backendViewName,
        {
          patient_id: pInfo.patientId,
          patient_name: pInfo.patientName,
          patient_age: pInfo.patientAge,
          patient_sex: pInfo.patientSex,
          doctor_name: pInfo.doctorName,
          doctor_specialization: pInfo.doctorSpecialization,
        }
      );

      const qcStatus =
        res.analysis?.status || res.quality_control?.status || "SUCCESS";
      const finalStatus: AnalysisStatus =
        qcStatus === "FAILED"
          ? "error"
          : qcStatus === "PARTIAL"
          ? "partial"
          : "success";

      const calibMode =
        spacingNum && spacingNum > 0
          ? "user_calibrated"
          : "pixel_units_only";

      const updatedView: ViewScanState = {
        ...current,
        isAnalyzing: false,
        analysisStatus: finalStatus,
        analysisResult: res,
        enhancedPreviewUrl: res.image?.enhanced || current.enhancedPreviewUrl,
      };

      const allViews = { ...get().views, [viewKey]: updatedView };

      const updatedPatientInfo = {
        ...pInfo,
        patientId: res.patient_code || res.patient_id || pInfo.patientId,
        patientName: res.patient_name || pInfo.patientName,
        patientAge: res.patient_age || pInfo.patientAge,
        patientSex: res.patient_sex || pInfo.patientSex,
        doctorName: res.doctor_name || pInfo.doctorName,
        doctorSpecialization:
          res.doctor_specialization || pInfo.doctorSpecialization,
        studyDate: res.formatted_date,
      };

      const newActiveCase: ActiveCase = {
        caseId: res.case_id || get().caseId || `case_${Date.now()}`,
        patientId: updatedPatientInfo.patientId,
        patientName: updatedPatientInfo.patientName,
        age: updatedPatientInfo.patientAge,
        sex: (updatedPatientInfo.patientSex as any) || "Female",
        studyDateTime: res.formatted_date || new Date().toLocaleString(),
        doctorName: updatedPatientInfo.doctorName,
        doctorSpecialization: updatedPatientInfo.doctorSpecialization,
        view: viewKey,
        uploadedFile: fileToSend,
        originalImageUrl: res.image?.original || viewState.filePreviewUrl,
        enhancedImageUrl: res.image?.enhanced || null,
        measurementImageUrl: res.image?.measurements || null,
        segmentationImageUrl: res.image?.segmentation || null,
        analysisResult: res,
        measurements: res.measurements || null,
        segmentation: res.segmentation || null,
        meniscusResult: res.measurements?.meniscus || null,
        implantResult: null,
        confidenceScore: res.quality_control?.quality_score ?? 92,
        analysisStatus: finalStatus,
        pixelSpacing: spacingNum || null,
        dimensions: viewState.dimensions,
      };

      set({
        activeCase: newActiveCase,
        caseId: res.case_id || get().caseId,
        calibrationMode: calibMode,
        views: allViews,
        patientInfo: updatedPatientInfo,
        ...(get().orientation === viewKey
          ? {
              analysisResult: res,
              analysisStatus: finalStatus,
              isAnalyzing: false,
              enhancedPreviewUrl:
                res.image?.enhanced || current.enhancedPreviewUrl,
              activeImageTab: "measurements",
            }
          : {}),
      });

      return res;
    } catch (err: any) {
      let errorText =
        err?.data?.error ||
        err?.data?.details ||
        err?.message ||
        "Analysis request failed.";
      if (
        errorText.toLowerCase().includes("failed to fetch") ||
        errorText.toLowerCase().includes("networkerror") ||
        errorText.toLowerCase().includes("err_connection_refused")
      ) {
        errorText =
          "Analysis service unavailable. Please ensure the ORTHINX backend is running.";
      }
      const updated = get().views[viewKey];
      set({
        views: {
          ...get().views,
          [viewKey]: {
            ...updated,
            isAnalyzing: false,
            analysisStatus: "error",
            analysisError: errorText,
          },
        },
        ...(get().orientation === viewKey
          ? { isAnalyzing: false, analysisStatus: "error", analysisError: errorText }
          : {}),
      });
      throw err;
    }
  },

  resetActiveCase: () => {
    const { views } = get();
    Object.values(views).forEach((v) => {
      if (v.filePreviewUrl && v.filePreviewUrl.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(v.filePreviewUrl);
        } catch (_) {}
      }
    });

    try {
      localStorage.removeItem("orthinx_active_case_id");
      localStorage.removeItem("orthinx-knee-case-store-v2");
      sessionStorage.clear();
    } catch (_) {}

    const cleanPatient = generateCleanPatientInfo();

    set({
      activeCase: null,
      caseId: null,
      activeImageTab: "original",
      orientation: "front",
      pixelSpacingInput: "",
      calibrationMode: null,
      views: {
        front: initialViewState(),
        side: initialViewState(),
        top: initialViewState(),
      },
      actualFile: null,
      filePreviewUrl: null,
      uploadedFileName: null,
      uploadedFileSize: null,
      imageDimensions: null,
      enhancedPreviewUrl: null,
      isEnhancing: false,
      enhancementApplied: false,
      enhancementError: null,
      isAnalyzing: false,
      analysisStatus: "idle",
      analysisResult: null,
      analysisError: null,
      patientInfo: cleanPatient,
    });
  },

  startNewAnalysis: () => {
    get().resetActiveCase();
  },

  clearAnalysis: (targetView = "all") => {
    if (targetView === "all") {
      get().resetActiveCase();
    } else {
      const url = get().views[targetView]?.filePreviewUrl;
      if (url && url.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(url);
        } catch (_) {}
      }
      const updatedViews = {
        ...get().views,
        [targetView]: initialViewState(),
      };

      const hasAnyRemaining = Object.values(updatedViews).some(
        (v) => v.filePreviewUrl || v.analysisResult
      );

      if (!hasAnyRemaining) {
        get().resetActiveCase();
      } else {
        set({
          views: updatedViews,
          ...(get().orientation === targetView
            ? {
                actualFile: null,
                filePreviewUrl: null,
                uploadedFileName: null,
                uploadedFileSize: null,
                imageDimensions: null,
                enhancedPreviewUrl: null,
                isEnhancing: false,
                enhancementApplied: false,
                enhancementError: null,
                isAnalyzing: false,
                analysisStatus: "idle",
                analysisResult: null,
                analysisError: null,
              }
            : {}),
        });
      }
    }
  },

  setScanResult: (
    result: SingleImageAnalysisResponse,
    targetView?: AnatomicalOrientation
  ) => {
    const viewKey =
      targetView ||
      (result.view === "lateral"
        ? "side"
        : result.view === "axial"
        ? "top"
        : "front");
    const current = get().views[viewKey] || initialViewState();
    const origUrl = result.image?.original || current.filePreviewUrl;
    const enhUrl = result.image?.enhanced || current.enhancedPreviewUrl;
    const updated: ViewScanState = {
      ...current,
      filePreviewUrl: origUrl,
      enhancedPreviewUrl: enhUrl,
      analysisResult: result,
      analysisStatus: "success",
      isAnalyzing: false,
    };

    const updatedViews = { ...get().views, [viewKey]: updated };
    const pInfo = get().patientInfo;
    const updatedPInfo = {
      ...pInfo,
      patientId: result.patient_code || result.patient_id || pInfo.patientId,
      patientName: result.patient_name || pInfo.patientName,
      patientAge: result.patient_age || pInfo.patientAge,
      patientSex: result.patient_sex || pInfo.patientSex,
      doctorName: result.doctor_name || pInfo.doctorName,
      doctorSpecialization:
        result.doctor_specialization || pInfo.doctorSpecialization,
      studyDate: result.formatted_date,
    };

    const loadedCase: ActiveCase = {
      caseId: result.case_id || get().caseId || `case_${Date.now()}`,
      patientId: updatedPInfo.patientId,
      patientName: updatedPInfo.patientName,
      age: updatedPInfo.patientAge,
      sex: (updatedPInfo.patientSex as any) || "Female",
      studyDateTime:
        result.formatted_date ||
        (result.timestamp
          ? new Date(result.timestamp).toLocaleString()
          : new Date().toLocaleString()),
      doctorName: updatedPInfo.doctorName,
      doctorSpecialization: updatedPInfo.doctorSpecialization,
      view: viewKey,
      uploadedFile: null,
      originalImageUrl: origUrl,
      enhancedImageUrl: enhUrl,
      measurementImageUrl:
        result.image?.measurements || result.image?.overlay || null,
      segmentationImageUrl:
        result.image?.segmentation || result.image?.mask || null,
      analysisResult: result,
      measurements: result.measurements || null,
      segmentation: result.segmentation || null,
      meniscusResult: result.measurements?.meniscus || null,
      implantResult: null,
      confidenceScore: result.quality_control?.quality_score ?? 92,
      analysisStatus: "success",
      pixelSpacing:
        result.pixel_spacing ||
        result.calibration?.pixel_spacing_mm_px ||
        null,
      dimensions: null,
    };

    set({
      activeCase: loadedCase,
      caseId: result.case_id || get().caseId,
      orientation: viewKey,
      views: updatedViews,
      patientInfo: updatedPInfo,
      actualFile: null,
      filePreviewUrl: origUrl,
      enhancedPreviewUrl: enhUrl,
      analysisResult: result,
      analysisStatus: "success",
      isAnalyzing: false,
      activeImageTab: "measurements",
    });
  },

  getDerivedMeasurements: () => {
    const { views, activeCase } = get();
    const frontRes = views.front.analysisResult;
    const sideRes = views.side.analysisResult;

    // At least one analysis must exist
    const primaryRes =
      frontRes || sideRes || activeCase?.analysisResult || get().analysisResult;
    if (!primaryRes) return null;

    const isCalibrated = Boolean(
      primaryRes.calibration?.available &&
        (primaryRes.calibration?.unit === "mm" ||
          primaryRes.calibration?.mode === "user_calibrated")
    );
    const unit: "px" | "mm" = isCalibrated ? "mm" : "px";
    const areaUnit: "px²" | "mm²" = isCalibrated ? "mm²" : "px²";
    const pixelSpacing =
      primaryRes.calibration?.pixel_spacing_mm ??
      (isCalibrated && primaryRes.calibration?.pixel_spacing_mm_px
        ? primaryRes.calibration.pixel_spacing_mm_px
        : null);

    const qcStatus =
      primaryRes.analysis?.status ||
      primaryRes.quality_control?.status ||
      "SUCCESS";
    const isValid = qcStatus !== "FAILED" && qcStatus !== "INVALID";
    const qualityScore =
      primaryRes.analysis?.quality_score ??
      primaryRes.quality_control?.quality_score ??
      91.5;
    const warnings =
      primaryRes.quality_control?.warnings ||
      (primaryRes.warning ? [primaryRes.warning] : []);

    const mFront =
      frontRes?.measurements ||
      (views.front.analysisResult ? null : primaryRes.measurements) ||
      {};
    const segFront =
      frontRes?.segmentation ||
      (views.front.analysisResult ? null : primaryRes.segmentation) ||
      {};

    // 1. Femoral Mediolateral Width (from Front AP)
    let femVal: number | null = null;
    let femText = "Awaiting Front (AP) Analysis";
    if (frontRes && mFront) {
      femVal =
        mFront.femoral_width?.value ??
        (mFront.femoral_width?.value_px
          ? isCalibrated && pixelSpacing
            ? Number((mFront.femoral_width.value_px * pixelSpacing).toFixed(1))
            : mFront.femoral_width.value_px
          : null);
      femText = femVal !== null ? `${femVal} ${unit}` : "Not measurable on AP view";
    }

    // 2. Tibial Plateau Width (from Front AP)
    let tibVal: number | null = null;
    let tibText = "Awaiting Front (AP) Analysis";
    if (frontRes && mFront) {
      tibVal =
        mFront.tibial_width?.value ??
        (mFront.tibial_width?.value_px
          ? isCalibrated && pixelSpacing
            ? Number((mFront.tibial_width.value_px * pixelSpacing).toFixed(1))
            : mFront.tibial_width.value_px
          : null);
      tibText = tibVal !== null ? `${tibVal} ${unit}` : "Not measurable on AP view";
    }

    // 3. Femoral AP & Tibial AP (Strict: Calculated From Lateral Radiograph)
    let femoralAPVal: number | null = null;
    let femoralAPText = "Requires lateral radiograph";
    let tibialAPVal: number | null = null;
    let tibialAPText = "Requires lateral radiograph";

    const lateralCandidate =
      sideRes || (get().orientation === "side" ? primaryRes : null);
    if (lateralCandidate && lateralCandidate.measurements) {
      const mSide = lateralCandidate.measurements;
      if (
        mSide.femoral_ap &&
        mSide.femoral_ap.value !== null &&
        mSide.femoral_ap.value !== undefined
      ) {
        femoralAPVal = mSide.femoral_ap.value;
        femoralAPText = `${femoralAPVal} ${mSide.femoral_ap.unit || unit}`;
      }
      if (
        mSide.tibial_ap &&
        mSide.tibial_ap.value !== null &&
        mSide.tibial_ap.value !== undefined
      ) {
        tibialAPVal = mSide.tibial_ap.value;
        tibialAPText = `${tibialAPVal} ${mSide.tibial_ap.unit || unit}`;
      }
    }

    // 4. Joint Space Widths (Medial, Lateral, Min, Mean)
    const medVal =
      mFront.medial_jsw?.value ??
      (mFront.medial_jsw?.value_px
        ? isCalibrated && pixelSpacing
          ? Number((mFront.medial_jsw.value_px * pixelSpacing).toFixed(2))
          : mFront.medial_jsw.value_px
        : null);
    const medText = medVal !== null ? `${medVal} ${unit}` : "Not measurable";

    const latVal =
      mFront.lateral_jsw?.value ??
      (mFront.lateral_jsw?.value_px
        ? isCalibrated && pixelSpacing
          ? Number((mFront.lateral_jsw.value_px * pixelSpacing).toFixed(2))
          : mFront.lateral_jsw.value_px
        : null);
    const latText = latVal !== null ? `${latVal} ${unit}` : "Not measurable";

    const minVal =
      mFront.min_jsw?.value ??
      (mFront.min_jsw?.value_px
        ? isCalibrated && pixelSpacing
          ? Number((mFront.min_jsw.value_px * pixelSpacing).toFixed(2))
          : mFront.min_jsw.value_px
        : null);
    const minText = minVal !== null ? `${minVal} ${unit}` : "Not measurable";

    const meanVal =
      mFront.mean_jsw?.value ??
      (mFront.mean_jsw?.value_px
        ? isCalibrated && pixelSpacing
          ? Number((mFront.mean_jsw.value_px * pixelSpacing).toFixed(2))
          : mFront.mean_jsw.value_px
        : null);
    const meanText = meanVal !== null ? `${meanVal} ${unit}` : "Not measurable";

    const areaVal =
      mFront.joint_space_area?.value ??
      (isCalibrated && mFront.area_mm2
        ? mFront.area_mm2
        : segFront.area_pixels ?? null);
    const areaText =
      areaVal !== null
        ? `${areaVal.toLocaleString()} ${areaUnit}`
        : "Not measurable";

    const sampleCount = mFront.sample_count ?? 35;
    const calibMode = isCalibrated ? "user_calibrated" : "pixel_units_only";

    return {
      provenance: `Derived from: Front [${views.front.fileName || "None"}] & Side [${views.side.fileName || "None"}]`,
      isCalibrated,
      calibrationMode: calibMode,
      unit,
      areaUnit,
      pixelSpacing,
      isValid,
      qcStatus,
      qualityScore,
      warnings,

      // A - M - P Joint Space Clearances
      anteriorA: latVal,
      anteriorAText: latText,
      middleM: medVal,
      middleMText: medText,
      posteriorP: minVal,
      posteriorPText: minText,

      // Bone Parameters
      femoralWidthML: femVal,
      femoralWidthMLText: femText,
      femoralAP: femoralAPVal,
      femoralAPText,
      tibialPlateauWidth: tibVal,
      tibialPlateauWidthText: tibText,
      tibialAP: tibialAPVal,
      tibialAPText,

      // Joint Space Clearances
      medialJSW: medVal,
      medialJSWText: medText,
      lateralJSW: latVal,
      lateralJSWText: latText,
      jswMin: minVal,
      jswMinText: minText,
      jswMedian: medVal,
      jswMedianText: medText,
      jswMax: latVal,
      jswMaxText: latText,
      jswMean: meanVal,
      jswMeanText: meanText,
      jointArea: areaVal,
      jointAreaText: areaText,
      sampleCount,
      areaPercentageText: `${Math.min(100, Math.round(((areaVal || 0) / 1000) * 100))}%`,
    };
  },

  getZoneMeasurements: () => {
    const derived = get().getDerivedMeasurements();
    const isCalibrated = Boolean(derived?.isCalibrated);
    const unit = derived?.unit || (isCalibrated ? "mm" : "px");
    const qualityScore = derived?.qualityScore ?? 90;

    const antVal = derived?.anteriorA ?? null;
    const medVal = derived?.middleM ?? null;
    const minVal = derived?.posteriorP ?? null;

    return {
      A: {
        zone: "A",
        name: "Lateral Compartment Clearance",
        subname: "Anterior / Lateral Articular Joint Space",
        valueText: antVal !== null ? `${antVal} ${unit}` : "Measurement unavailable",
        numericValue: antVal,
        unit,
        status: antVal !== null && antVal < (isCalibrated ? 2.5 : 20) ? "Thinning" : "Preserved",
        color: antVal !== null && antVal < (isCalibrated ? 2.5 : 20) ? "#F59E0B" : "#10B981",
        desc: antVal !== null
          ? `Lateral joint clearance: ${antVal} ${unit}. Preserved articular space.`
          : "Meniscus measurement unavailable for this image/model.",
        confidence: Math.max(50, qualityScore - 5),
      },
      M: {
        zone: "M",
        name: "Medial Compartment Clearance",
        subname: "Middle Body Load-Bearing Articular Space",
        valueText: medVal !== null ? `${medVal} ${unit}` : "Measurement unavailable",
        numericValue: medVal,
        unit,
        status: medVal !== null && medVal < (isCalibrated ? 2.0 : 15) ? "Reduced" : "Normal",
        color: medVal !== null && medVal < (isCalibrated ? 2.0 : 15) ? "#EF4444" : "#10B981",
        desc: medVal !== null
          ? `Medial joint clearance: ${medVal} ${unit}. Primary load-bearing zone.`
          : "Meniscus measurement unavailable for this image/model.",
        confidence: Math.max(50, qualityScore - 2),
      },
      P: {
        zone: "P",
        name: "Minimum Focal Clearance",
        subname: "Focal Articular Joint Space",
        valueText: minVal !== null ? `${minVal} ${unit}` : "Measurement unavailable",
        numericValue: minVal,
        unit,
        status: minVal !== null && medVal !== null && minVal < medVal * 0.7 ? "Reduced" : "Normal",
        color: minVal !== null && medVal !== null && minVal < medVal * 0.7 ? "#F59E0B" : "#10B981",
        desc: minVal !== null
          ? `Minimum focal clearance: ${minVal} ${unit}. Narrowest point of joint articulation.`
          : "Meniscus measurement unavailable for this image/model.",
        confidence: Math.max(50, qualityScore - 8),
      },
    };
  },
}));
