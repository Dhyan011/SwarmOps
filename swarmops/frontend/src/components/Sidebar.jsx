import { NavLink, useLocation } from "react-router-dom";
import {
  HiOutlineSquares2X2,
  HiOutlineBolt,
  HiOutlineChartBar,
  HiOutlineCog6Tooth,
} from "react-icons/hi2";

const navItems = [
  { to: "/dashboard", icon: HiOutlineSquares2X2, label: "Dashboard" },
  { to: "/analytics", icon: HiOutlineChartBar, label: "Analytics" },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[72px] bg-[#0c1220] border-r border-white/[0.08] flex flex-col items-center z-50">
      {/* Logo */}
      <NavLink to="/" className="w-full flex items-center justify-center py-5 mb-2 hover:scale-105 transition-transform duration-200">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-amber-500 shadow-lg shadow-blue-500/20">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 20V16C7 12.134 10.134 9 14 9H17" />
            <path d="M4 14C4 9.582 7.582 6 12 6C16.418 6 20 9.582 20 14" opacity="0.5" />
            <circle cx="12" cy="20" r="2" fill="white" stroke="none" />
          </svg>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1 w-full px-3">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`
                relative w-full aspect-square max-w-[48px] rounded-xl
                flex items-center justify-center
                transition-all duration-200 group
                ${
                  active
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-600 font-medium hover:text-slate-300 hover:bg-white/[0.03]"
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-400" />
              )}
              <Icon className="w-[22px] h-[22px]" />
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-[#1a2340] text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-white/[0.08] z-50">
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-2 pb-5 w-full px-3">
        <button className="w-full max-w-[48px] aspect-square rounded-xl flex items-center justify-center text-slate-600 font-medium hover:text-slate-300 hover:bg-white/[0.03] transition-all duration-200 group relative">
          <HiOutlineCog6Tooth className="w-[22px] h-[22px]" />
          <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-[#1a2340] text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-lg border border-white/[0.08] z-50">
            Settings
          </span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-amber-500 flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-white/[0.06] cursor-pointer hover:ring-blue-500/30 transition-all duration-200">
          S
        </div>
      </div>
    </aside>
  );
}
