import React from "react";
import { HiOutlineInformationCircle } from "react-icons/hi2";

export default function ConfidenceMeter({ value = 0 }) {
  const score = Math.max(0, Math.min(100, value));
  
  // 0–40% → Rose
  // 40–65% → Amber
  // 65–85% → Indigo
  // 85–100% → Emerald
  let colorClass = "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]";
  let textColor = "text-emerald-400";

  if (score < 40) {
    colorClass = "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]";
    textColor = "text-rose-400";
  } else if (score < 65) {
    colorClass = "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]";
    textColor = "text-amber-400";
  } else if (score < 85) {
    colorClass = "bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]";
    textColor = "text-indigo-400";
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold">
        <span className="text-slate-400 flex items-center gap-1">
          Confidence
          <HiOutlineInformationCircle className="w-2.5 h-2.5 opacity-50" />
        </span>
        <span className={textColor}>{score}%</span>
      </div>
      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`}
          style={{ width: `${Math.max(5, score)}%` }}
        />
      </div>
    </div>
  );
}
