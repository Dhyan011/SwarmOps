import { Check, X } from "lucide-react";

const variants = {
  critical: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
  high: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  medium: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20",
  low: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  running: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
  deployed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  rejected: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
  neutral: "bg-white/5 text-white/80 border border-white/10",
};

export default function StatusBadge({ variant = "neutral", children, className = "" }) {
  const isRunning = variant === "running";
  const isDeployed = variant === "deployed";
  const isRejected = variant === "rejected";
  
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-[11px] font-bold uppercase tracking-wider
        rounded-full whitespace-nowrap
        ${variants[variant] || variants.neutral}
        ${className}
      `}
    >
      {isRunning && (
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-dot" />
      )}
      {isDeployed && <Check size={12} className="text-emerald-400" />}
      {isRejected && <X size={12} className="text-rose-400" />}
      
      {!isRunning && !isDeployed && !isRejected && variant !== "neutral" && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full
            ${variant === "critical" ? "bg-rose-400" : ""}
            ${variant === "high" ? "bg-amber-400" : ""}
            ${variant === "medium" ? "bg-indigo-400" : ""}
            ${variant === "low" ? "bg-emerald-400" : ""}
          `}
        />
      )}
      {children}
    </span>
  );
}
