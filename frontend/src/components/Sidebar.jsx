import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  HiOutlineSquares2X2,
  HiOutlineBolt,
  HiOutlineChartBar,
  HiOutlineDocumentDuplicate,
  HiOutlineCog6Tooth,
  HiArrowRightOnRectangle,
  HiOutlineSun,
  HiOutlineMoon,
} from "react-icons/hi2";

const navItems = [
  { to: "/dashboard", icon: HiOutlineSquares2X2, label: "Dashboard", color: "indigo" },
  { to: "/new-incident", icon: HiOutlineBolt, label: "New Investigation", color: "none" },
  { to: "/analytics", icon: HiOutlineChartBar, label: "Analytics", color: "cyan" },
  { to: "/memory", icon: HiOutlineDocumentDuplicate, label: "Agent Memory", color: "violet" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(document.body.classList.contains("light-theme") ? "light" : "dark");

  const toggleTheme = () => {
    if (theme === "dark") {
      document.body.classList.add("light-theme");
      setTheme("light");
    } else {
      document.body.classList.remove("light-theme");
      setTheme("dark");
    }
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("openrouter_api_key");
    navigate("/login");
  };

  const getColorClasses = (color, active) => {
    if (color === "none") return "text-white bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20";
    if (!active) return "text-slate-400 font-medium hover:text-white hover:bg-white/[0.05]";
    
    switch (color) {
      case "indigo": return "bg-indigo-500/10 text-indigo-400";
      case "cyan": return "bg-cyan-500/10 text-cyan-400";
      case "violet": return "bg-violet-500/10 text-violet-400";
      case "slate": return "bg-slate-500/10 text-slate-300";
      default: return "bg-white/10 text-white";
    }
  };

  const getIndicatorColor = (color) => {
    switch (color) {
      case "indigo": return "bg-indigo-400";
      case "cyan": return "bg-cyan-400";
      case "violet": return "bg-violet-400";
      case "slate": return "bg-slate-400";
      default: return "bg-white";
    }
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] layer-1 border-r border-white/[0.08] flex flex-col items-center z-50 transition-colors duration-300">
      {/* Logo */}
      <NavLink to="/" className="w-full flex items-center justify-center py-5 mb-2 hover:scale-105 transition-transform duration-200">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 20V16C7 12.134 10.134 9 14 9H17" />
            <path d="M4 14C4 9.582 7.582 6 12 6C16.418 6 20 9.582 20 14" opacity="0.5" />
            <circle cx="12" cy="20" r="2" fill="white" stroke="none" />
          </svg>
        </div>
      </NavLink>

      {/* Main Navigation */}
      <nav className="flex flex-col items-center gap-2 flex-1 w-full px-3">
        {navItems.map(({ to, icon: Icon, label, color }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`
                relative w-full aspect-square max-w-[48px] rounded-xl
                flex items-center justify-center
                transition-all duration-200 group
                ${getColorClasses(color, active)}
              `}
            >
              {active && color !== "none" && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${getIndicatorColor(color)}`} />
              )}
              <Icon className="w-[22px] h-[22px]" />
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md layer-3 text-[13px] font-bold text-text-main whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-white/[0.08] z-50">
                {label}
              </span>
            </NavLink>
          );
        })}
        
        <div className="w-8 h-px bg-white/10 my-2" />
        
        <NavLink
          to="/settings"
          className={`
            relative w-full aspect-square max-w-[48px] rounded-xl
            flex items-center justify-center
            transition-all duration-200 group
            ${getColorClasses("slate", isActive("/settings"))}
          `}
        >
          {isActive("/settings") && (
            <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${getIndicatorColor("slate")}`} />
          )}
          <HiOutlineCog6Tooth className="w-[22px] h-[22px]" />
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md layer-3 text-[13px] font-bold text-text-main whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-white/[0.08] z-50">
            Settings
          </span>
        </NavLink>
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-3 pb-5 w-full px-3">
        {/* Provider Indicator (Hardcoded for Demo) */}
        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-glow-blue animate-pulse-dot" title="Gemini Connected" />
        
        <button 
          onClick={toggleTheme}
          className="w-full max-w-[48px] aspect-square rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all duration-200 group relative"
        >
          {theme === "dark" ? <HiOutlineSun className="w-[22px] h-[22px]" /> : <HiOutlineMoon className="w-[22px] h-[22px]" />}
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md layer-3 text-[13px] font-bold text-text-main whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-white/[0.08] z-50">
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        </button>

        <button 
          onClick={handleLogout}
          className="w-full max-w-[48px] aspect-square rounded-xl flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 group relative"
        >
          <HiArrowRightOnRectangle className="w-[22px] h-[22px]" />
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md layer-3 text-[13px] font-bold text-text-main whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-white/[0.08] z-50">
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
