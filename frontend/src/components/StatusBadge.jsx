import { HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";

const variants = {
  critical: "bg-rose-300/10 text-rose-100 border border-rose-300/20",
  high: "bg-amber-300/10 text-amber-100 border border-amber-300/20",
  medium: "bg-blue-300/10 text-blue-100 border border-blue-300/20",
  low: "bg-emerald-300/10 text-emerald-100 border border-emerald-300/20",
  running: "bg-blue-300/10 text-blue-100 border border-blue-300/20",
  review: "bg-amber-300/10 text-amber-100 border border-amber-300/20",
  pr: "bg-indigo-300/10 text-indigo-100 border border-indigo-300/20",
  failure: "bg-rose-300/10 text-rose-100 border border-rose-300/20",
  deployed: "bg-emerald-300/10 text-emerald-100 border border-emerald-300/20",
  rejected: "bg-rose-300/10 text-rose-100 border border-rose-300/20",
  neutral: "bg-white/5 text-slate-200 border border-white/10",
};

export default function StatusBadge({ variant = "neutral", children, className = "" }) {
  const isRunning = variant === "running";
  const isSuccess = variant === "deployed";
  const isFailure = variant === "rejected" || variant === "failure";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ${variants[variant] || variants.neutral} ${className}`}>
      {isRunning && <span className="h-1.5 w-1.5 rounded-full bg-blue-200" aria-hidden="true" />}
      {isSuccess && <HiOutlineCheck className="h-3 w-3" aria-hidden="true" />}
      {isFailure && <HiOutlineXMark className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}
