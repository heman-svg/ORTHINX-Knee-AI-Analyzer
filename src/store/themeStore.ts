import { create } from "zustand";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const getInitialTheme = (): ThemeMode => {
  const saved = localStorage.getItem("orthinx_theme");
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

export const useTheme = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    localStorage.setItem("orthinx_theme", next);
    document.documentElement.setAttribute("data-theme", next);
    set({ theme: next });
  },
  setTheme: (theme: ThemeMode) => {
    localStorage.setItem("orthinx_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },
}));
