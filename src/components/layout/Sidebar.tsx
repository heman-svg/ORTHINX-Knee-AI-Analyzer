import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Activity,
  Layers,
  Sparkles,
  FileText,
  Settings,
  HelpCircle,
} from "lucide-react";
import orthinxLogo from "../../assets/orthinx_logo_clean.png";

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: "Dashboard", path: "/", icon: LayoutDashboard },
    { label: "Patient Records", path: "/patients", icon: Users },
    { label: "Knee Analysis", path: "/upload", icon: Activity },
    { label: "Meniscus Analysis", path: "/analysis/meniscus", icon: Layers },
    { label: "Implant Planning", path: "/implant-planning", icon: Sparkles },
    { label: "Reports", path: "/reports", icon: FileText },
    { label: "Settings", path: "/settings", icon: Settings },
    { label: "Help & Support", path: "/help", icon: HelpCircle },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <img
            src={orthinxLogo}
            alt="ORTHINX Logo"
            style={{
              width: "34px",
              height: "34px",
              objectFit: "contain",
              display: "block",
              flexShrink: 0,
            }}
          />
          <span>ORTHINX</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              end={item.path === "/"}
            >
              <Icon className="nav-icon" size={19} />
              <span className="nav-text">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};