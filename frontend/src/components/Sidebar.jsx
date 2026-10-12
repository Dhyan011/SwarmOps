import { Link, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { HiArrowRightOnRectangle, HiOutlineBolt, HiOutlineSquares2X2, HiOutlineCog6Tooth, HiOutlineCodeBracket } from "react-icons/hi2";
import { supabase } from "../services/supabase";

const navItems = [
  { to: "/dashboard", icon: HiOutlineSquares2X2, label: "Investigations" },
  { to: "/new-incident", icon: HiOutlineBolt, label: "New investigation" },
  { to: "/contribute", icon: HiOutlineCodeBracket, label: "Contributions" },
  { to: "/settings", icon: HiOutlineCog6Tooth, label: "Settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setSigningOut(true);
    setError("");
    try {
      if (supabase) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;
      }
      for (const key of ["gemini_key", "groq_key", "openrouter_api_key"]) {
        try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
      }
      navigate("/login", { replace: true });
    } catch {
      setError("Sign out could not be confirmed. Please try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <aside className="z-30 border-b border-white/10 bg-[#0c1119] md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-b-0 md:border-r" aria-label="SwarmOps workspace">
      <div className="flex items-center justify-between px-4 py-3 md:border-b md:border-white/10 md:px-5 md:py-5">
        <Link to="/dashboard" className="inline-flex items-center gap-3 rounded-md text-white" aria-label="SwarmOps investigations">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/10 text-blue-200" aria-hidden="true"><HiOutlineBolt className="h-5 w-5" /></span>
          <span className="font-semibold tracking-tight">SwarmOps</span>
        </Link>
        <button type="button" onClick={handleLogout} disabled={signingOut} aria-label="Sign out of SwarmOps" className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-60 md:hidden">
          <HiArrowRightOnRectangle className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <nav aria-label="Workspace navigation" className="flex gap-1 overflow-x-auto px-3 py-2 md:block md:space-y-1 md:px-3 md:py-5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === "/dashboard"} className={({ isActive }) => `inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors md:flex ${isActive ? "bg-blue-300/10 text-blue-100" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />{label}
          </NavLink>
        ))}
      </nav>

      {error && <p role="alert" className="px-4 py-2 text-xs leading-5 text-rose-200 md:hidden">{error}</p>}
      <div className="hidden px-4 md:absolute md:bottom-0 md:left-0 md:right-0 md:block md:border-t md:border-white/10 md:py-4">
        {error && <p role="alert" className="mb-3 text-xs leading-5 text-rose-200">{error}</p>}
        <button type="button" onClick={handleLogout} disabled={signingOut} className="inline-flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-60"><HiArrowRightOnRectangle className="h-4 w-4" />{signingOut ? "Signing out…" : "Sign out"}</button>
      </div>
    </aside>
  );
}
