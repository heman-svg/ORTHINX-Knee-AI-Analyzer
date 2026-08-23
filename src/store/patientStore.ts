import { create } from "zustand";
import { patientApi, BackendPatient } from "../lib/api";

export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export type Patient = {
  id: string;
  patientCode?: string;
  name: string;
  age: number;
  sex: "Male" | "Female" | "Other";
  bloodType?: BloodType;
  createdAt: Date;
  updatedAt: Date;
};

export type MedicalImage = {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  url: string;
  studyId: string;
  patientId: string;
  createdAt: Date;
};

export type Study = {
  id: string;
  patientId: string;
  description: string;
  createdAt: Date;
  images: MedicalImage[];
};

export type Analysis = {
  id: string;
  studyId: string;
  status: "pending" | "processing" | "completed" | "failed";
  meniscusThickness?: number;
  femoralWidth?: number;
  femoralAP?: number;
  tibialWidth?: number;
  tibialAP?: number;
  oaGrade?: number;
  createdAt: Date;
  completedAt?: Date;
};

export type ImplantCandidate = {
  id: string;
  componentType: "femoral" | "tibial";
  size: string;
  fitScore: string;
  femoralWidth?: number;
  femoralAP?: number;
  tibialWidth?: number;
  tibialAP?: number;
};

export type ImplantRecommendation = {
  id: string;
  patientId: string;
  studyId: string;
  analysisId: string;
  rankedCandidates: ImplantCandidate[];
  createdAt: Date;
};

export interface PatientStore {
  patients: Patient[];
  selectedPatient: Patient | null;
  loading: boolean;
  error: string | null;
  backendConnected: boolean;
  setSelectedPatient: (patient: Patient | null) => void;
  fetchPatients: () => Promise<void>;
  createPatient: (patient: Omit<Patient, "id" | "createdAt" | "updatedAt">) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
}

const mapBackendPatient = (bp: BackendPatient): Patient => ({
  id: String(bp.id),
  patientCode: bp.patient_code,
  name: bp.name,
  age: bp.age,
  sex: bp.sex.toUpperCase() === "M" ? "Male" : bp.sex.toUpperCase() === "F" ? "Female" : "Other",
  createdAt: new Date(bp.created_at || Date.now()),
  updatedAt: new Date(bp.created_at || Date.now()),
});

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: [
    { id: "1", patientCode: "PAT-001", name: "Eleanor Vance", age: 64, sex: "Female", createdAt: new Date(Date.now() - 86400000 * 2), updatedAt: new Date() },
    { id: "2", patientCode: "PAT-002", name: "Marcus Chen", age: 58, sex: "Male", createdAt: new Date(Date.now() - 86400000), updatedAt: new Date() },
  ],
  selectedPatient: null,
  loading: false,
  error: null,
  backendConnected: false,

  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  fetchPatients: async () => {
    set({ loading: true, error: null });
    try {
      const backendPatients = await patientApi.list();
      if (Array.isArray(backendPatients) && backendPatients.length > 0) {
        set({
          patients: backendPatients.map(mapBackendPatient),
          loading: false,
          backendConnected: true,
        });
      } else {
        // Connected to backend, but no patients in db yet
        set({ loading: false, backendConnected: true });
      }
    } catch (err: any) {
      console.warn("Backend API unavailable or error fetching patients, using local fallback state:", err?.message);
      set({ loading: false, backendConnected: false, error: err?.message || null });
    }
  },

  createPatient: async (patientData) => {
    set({ loading: true, error: null });
    const code = patientData.patientCode || `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const sexCode = patientData.sex === "Male" ? "M" : patientData.sex === "Female" ? "F" : "Other";

    try {
      const backendPatient = await patientApi.create({
        patient_code: code,
        name: patientData.name,
        age: patientData.age,
        sex: sexCode,
      });
      const newPatient = mapBackendPatient(backendPatient);
      set({
        patients: [newPatient, ...get().patients.filter(p => p.id !== newPatient.id)],
        selectedPatient: newPatient,
        loading: false,
        backendConnected: true,
      });
      return newPatient;
    } catch (err: any) {
      console.warn("Could not save to backend directly, saving locally:", err?.message);
      const fallbackPatient: Patient = {
        id: Math.random().toString(36).substring(2, 9),
        patientCode: code,
        ...patientData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      set({
        patients: [fallbackPatient, ...get().patients],
        selectedPatient: fallbackPatient,
        loading: false,
      });
      return fallbackPatient;
    }
  },

  updatePatient: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await patientApi.update(numId, {
          name: data.name,
          age: data.age,
          sex: data.sex ? (data.sex === "Male" ? "M" : data.sex === "Female" ? "F" : "Other") : undefined,
        });
      }
    } catch (err) {
      console.warn("Could not update on backend, updating locally:", err);
    }
    set({
      patients: get().patients.map((p) =>
        p.id === id ? { ...p, ...data, updatedAt: new Date() } : p
      ),
      loading: false,
    });
  },

  deletePatient: async (id) => {
    set({ loading: true, error: null });
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await patientApi.delete(numId);
      }
    } catch (err) {
      console.warn("Could not delete from backend, deleting locally:", err);
    }
    set({
      patients: get().patients.filter((p) => p.id !== id),
      loading: false,
    });
  },
}));