import { useMemo } from "react";

export default function ConfidenceMeter({ value = 0, size = "default" }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const color = useMemo(() => {
    if (clampedValue >= 70) return { bar: "bg-emerald-400", text: "text-emerald-400", glow: "shadow-emerald-400/20" };
    if (clampedValue >= 30) return { bar: "bg-amber-400", text: "text-amber-400", glow: "shadow-amber-400/20" };
    return { bar: "bg-red-400", text: "text-red-400", glow: "shadow-red-400/20" };
  }, [clampedValue]);

  const heightClass = size === "sm" ? "h-1.5" : "h-2.5";

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={`flex-1 ${heightClass} rounded-full bg-slate-900/40 overflow-hidden`}>
        <div
          className={`h-full rounded-full ${color.bar} transition-all duration-1000 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${color.text} min-w-[3rem] text-right`}>
        {clampedValue}%
      </span>
    </div>
  );
}
