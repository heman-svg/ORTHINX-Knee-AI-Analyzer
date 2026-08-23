import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useTheme } from "./store/themeStore";

export default function App() {
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-app text-main">
      <Outlet />
    </div>
  );
}