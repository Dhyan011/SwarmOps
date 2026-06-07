const variants = {
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  danger: "bg-red-500/15 text-red-400 border border-red-500/20",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  neutral: "bg-white/5 text-slate-400 border border-white/10",
  critical: "bg-red-600/20 text-red-300 border border-red-500/30",
  amber: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
};

export default function StatusBadge({ variant = "neutral", children, className = "", dot = false }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-[11px] font-semibold uppercase tracking-wider
        rounded-full whitespace-nowrap
        ${variants[variant] || variants.neutral}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full
            ${variant === "success" ? "bg-emerald-400" : ""}
            ${variant === "warning" ? "bg-amber-400" : ""}
            ${variant === "danger" || variant === "critical" ? "bg-red-400" : ""}
            ${variant === "info" ? "bg-blue-400" : ""}
            ${variant === "neutral" ? "bg-slate-400" : ""}
            ${variant === "amber" ? "bg-amber-400" : ""}
          `}
        />
      )}
      {children}
    </span>
  );
}
