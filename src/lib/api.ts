/**
 * Core API client configuration and helper methods using native fetch.
 * All backend API requests should go through these helpers.
 */

const API_BASE_URL = "/api";

export class APIError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    // Attempt to parse JSON response
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      throw new APIError(
        response.status,
        data?.detail || response.statusText || "An API error occurred",
        data
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(500, error instanceof Error ? error.message : "Network error");
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: "GET" }),
  
  post: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: "POST", 
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined 
    }),
  
  put: <T>(endpoint: string, body?: any, options?: RequestInit) => 
    request<T>(endpoint, { 
      ...options, 
      method: "PUT", 
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined 
    }),
  
  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export interface BackendPatient {
  id: number;
  patient_code: string;
  name: string;
  age: number;
  sex: "M" | "F" | "Other" | "m" | "f" | "other";
  created_at: string;
}

export interface BackendScan {
  scan_id: number;
  patient_id: number;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: string;
  preprocessed_path?: string | null;
  preprocessing_status?: string | null;
  segmentation_status?: string | null;
  femur_mask_path?: string | null;
  tibia_mask_path?: string | null;
  meniscus_mask_path?: string | null;
  uploaded_at: string;
}

export interface BackendSegmentationResponse {
  scan_id: number;
  status: string;
  model_available: boolean;
  message: string;
  structures: string[];
  femur_mask_path?: string | null;
  tibia_mask_path?: string | null;
  meniscus_mask_path?: string | null;
  knee_joint_mask_path?: string | null;
  overlay_path?: string | null;
  mask_relative_url?: string | null;
  overlay_relative_url?: string | null;
  measurements?: any;
  inference_time_ms?: number | null;
  device?: string | null;
}

export interface BackendMeasurementResponse {
  scan_id: number;
  status: string;
  model: string;
  native_dimensions: number[];
  segmentation: any;
  jsw: any;
  calibration: any;
  quality: any;
  visualization_path?: string | null;
  visualization_url?: string | null;
  processing_time_ms?: number | null;
}

export const patientApi = {
  list: (skip = 0, limit = 50) => api.get<BackendPatient[]>(`/patients?skip=${skip}&limit=${limit}`),
  get: (id: number | string) => api.get<BackendPatient>(`/patients/${id}`),
  create: (data: { patient_code: string; name: string; age: number; sex: string }) =>
    api.post<BackendPatient>("/patients", data),
  update: (id: number | string, data: Partial<{ name: string; age: number; sex: string }>) =>
    api.put<BackendPatient>(`/patients/${id}`, data),
  delete: (id: number | string) => api.delete<{ message: string; patient_id: number }>(`/patients/${id}`),
};

export interface SingleImageAnalysisResponse {
  success?: boolean;
  status: "success" | "failed" | "error";
  case_id?: string;
  image_id?: string;
  image?: {
    original?: string;
    enhanced?: string;
    measurements?: string;
    segmentation?: string;
    overlay?: string;
  };
  analysis?: {
    status: string;
    quality_score: number;
    latency_ms: number;
  };
  original_image?: {
    width: number;
    height: number;
    channels: number;
    dtype: string;
    format: string;
  };
  preprocessing?: {
    enhancement_applied: boolean;
    enhancement_details: any;
    letterbox_scale: number;
    padding: {
      pad_x: number;
      pad_y: number;
      target_width: number;
      target_height: number;
    };
  };
  segmentation?: {
    mask_available: boolean;
    area_pixels: number;
    area_percentage: number;
    component_count: number;
    quality: string;
    mask_url?: string;
    measurements_url?: string;
    overlay_url?: string;
    enhanced_url?: string;
    original_url?: string;
  };
  measurements: {
    // Nested anatomical schema
    femoral_width?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    tibial_width?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    medial_jsw?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    lateral_jsw?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    min_jsw?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    mean_jsw?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    joint_space_area?: { value: number | null; unit: string; value_px?: number | null; value_mm?: number | null; source: string };
    femoral_ap?: { value: number | null; unit: string | null; status?: string };
    tibial_ap?: { value: number | null; unit: string | null; status?: string };
    meniscus?: { status: string; message: string };

    // Legacy direct keys
    jsw_min_px?: number | null;
    jsw_median_px?: number | null;
    jsw_max_px?: number | null;
    jsw_mean_px?: number | null;
    jsw_min_mm?: number | null;
    jsw_median_mm?: number | null;
    jsw_max_mm?: number | null;
    sample_count?: number;
    area_mm2?: number | null;
  };
  calibration?: {
    available: boolean;
    mode?: "user_calibrated" | "user_verified" | "dicom_calibrated" | "pixel_units_only";
    unit: "pixels" | "mm" | "px";
    pixel_spacing_mm?: number | null;
    pixel_spacing_mm_px?: number | null;
  };
  quality_control?: {
    status: string;
    quality_score: number;
    warnings: string[];
    checks: Record<string, boolean>;
  };
  processing?: {
    inference_time_ms: number;
    total_time_ms: number;
  };
  warning?: string | null;
}

export const scanApi = {
  upload: (patientId: number | string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<BackendScan>(`/patients/${patientId}/images`, formData);
  },
  listByPatient: (patientId: number | string) =>
    api.get<BackendScan[]>(`/patients/${patientId}/images`),
  get: (scanId: number | string) => api.get<BackendScan>(`/scans/${scanId}`),
  getMetadata: (scanId: number | string) => api.get<any>(`/scans/${scanId}/metadata`),
  preprocess: (scanId: number | string, config?: any) =>
    api.post<any>(`/scans/${scanId}/preprocess`, config || {}),
  segment: (scanId: number | string) =>
    api.post<BackendSegmentationResponse>(`/scans/${scanId}/segment`),
  getSegmentationStatus: (scanId: number | string) =>
    api.get<any>(`/scans/${scanId}/segmentation`),
  measurements: (scanId: number | string) =>
    api.post<BackendMeasurementResponse>(`/scans/${scanId}/measurements`),
  getMeasurements: (scanId: number | string) =>
    api.get<BackendMeasurementResponse>(`/scans/${scanId}/measurements`),
  generateReport: (scanId: number | string) =>
    api.post<any>(`/scans/${scanId}/report`),
  getReport: (scanId: number | string) =>
    api.get<any>(`/scans/${scanId}/report`),
  getReportJsonUrl: (scanId: number | string) => `/api/scans/${scanId}/report/json`,
  getReportPdfUrl: (scanId: number | string) => `/api/scans/${scanId}/report/pdf`,

  // New Single-Image Pipeline API
  analyzeSingle: (
    file: File,
    enhancementConfig?: any,
    pixelSpacing?: number,
    view: string = "ap",
    patientInfo?: {
      patient_id?: string;
      patient_name?: string;
      patient_age?: number;
      patient_sex?: string;
      doctor_name?: string;
      doctor_specialization?: string;
    }
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    if (enhancementConfig) {
      formData.append("enhancement", JSON.stringify(enhancementConfig));
    }
    if (pixelSpacing && pixelSpacing > 0) {
      formData.append("pixel_spacing", String(pixelSpacing));
    }
    formData.append("view", view);
    if (patientInfo) {
      if (patientInfo.patient_id) formData.append("patient_id", patientInfo.patient_id);
      if (patientInfo.patient_name) formData.append("patient_name", patientInfo.patient_name);
      if (patientInfo.patient_age) formData.append("patient_age", String(patientInfo.patient_age));
      if (patientInfo.patient_sex) formData.append("patient_sex", patientInfo.patient_sex);
      if (patientInfo.doctor_name) formData.append("doctor_name", patientInfo.doctor_name);
      if (patientInfo.doctor_specialization) formData.append("doctor_specialization", patientInfo.doctor_specialization);
    }
    return api.post<SingleImageAnalysisResponse>("/scans/analyze-single", formData);
  },

  enhancePreview: (file: File, enhancementConfig?: any) => {
    const formData = new FormData();
    formData.append("file", file);
    if (enhancementConfig) {
      formData.append("enhancement", JSON.stringify(enhancementConfig));
    }
    return api.post<{
      status: string;
      original_url: string;
      enhanced_url: string;
      width: number;
      height: number;
      enhancement_details: any;
    }>("/scans/enhance-preview", formData);
  },

  getCase: (caseId: string) => api.get<SingleImageAnalysisResponse>(`/scans/case/${caseId}`),
  getCasePdfUrl: (caseId: string) => `/api/scans/case/${caseId}/pdf`,
  downloadCasePdf: async (caseId: string, filename?: string) => {
    const res = await fetch(`/api/scans/case/${caseId}/pdf`);
    if (!res.ok) throw new Error("Failed to download PDF report");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `ORTHINX_Report_${caseId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  generatePdfFromPayload: async (payload: any, filename?: string) => {
    const res = await fetch(`/api/scans/report/generate-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to generate PDF report");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `ORTHINX_Clinical_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  listAllCases: () => api.get<any[]>("/scans/cases/all"),
  getCase: (caseId: string) => api.get<any>(`/scans/case/${encodeURIComponent(caseId)}`),
  getAnalysis: (caseId: string) => api.get<any>(`/scans/analysis/${encodeURIComponent(caseId)}`),
};

