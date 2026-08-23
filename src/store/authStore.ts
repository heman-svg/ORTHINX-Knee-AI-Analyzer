import { create } from "zustand";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "patient" | "clinician" | "admin";
};

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  user: { id: "1", name: "Dr. Alex Morgan", email: "dr.alex@orthinx.health", role: "clinician" },
  isAuthenticated: true,
  isLoading: false,
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 800));
    const user: User = { id: "1", name: "Dr. Alex Morgan", email, role: "clinician" };
    set({ user, isAuthenticated: true, isLoading: false });
    localStorage.setItem("orthinx_auth", JSON.stringify(user));
  },
  logout: async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    set({ user: null, isAuthenticated: false, isLoading: false });
    localStorage.removeItem("orthinx_auth");
  },
  checkAuth: async () => {
    const stored = localStorage.getItem("orthinx_auth");
    if (stored) {
      try {
        set({ user: JSON.parse(stored), isAuthenticated: true, isLoading: false });
      } catch {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));