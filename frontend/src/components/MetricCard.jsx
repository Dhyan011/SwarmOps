import { HiOutlineArrowTrendingUp, HiOutlineArrowTrendingDown, HiOutlineMinus } from "react-icons/hi2";

export default function MetricCard({ label, value, suffix = "", trend = null, trendValue = "", icon: Icon, delay = 0 }) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-slate-200 font-medium";

  const TrendIcon =
    trend === "up"
      ? HiOutlineArrowTrendingUp
      : trend === "down"
      ? HiOutlineArrowTrendingDown
      : HiOutlineMinus;

  return (
    <div
      className="glass-card gradient-border p-6 animate-fade-in group cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-[13px] font-medium text-white text-lg font-semibold uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.08] flex items-center justify-center group-hover:border-blue-500/20 transition-colors duration-200">
            <Icon className="w-4.5 h-4.5 text-blue-400" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-white font-bold">
          {value}
        </span>
        {suffix && (
          <span className="text-base font-medium text-slate-200 font-medium mb-1">
            {suffix}
          </span>
        )}
      </div>
      {trend && (
        <div className={`flex items-center gap-1.5 mt-3 ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span className="text-base font-medium">{trendValue}</span>
        </div>
      )}
    </div>
  );
}
