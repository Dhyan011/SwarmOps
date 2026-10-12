import { useNavigate } from "react-router-dom";
import { HiOutlineChevronRight } from "react-icons/hi2";
import StatusBadge from "./StatusBadge";

const severityMap = { low: "low", medium: "medium", high: "high", critical: "critical" };
const severityBorder = {
  low: "border-l-emerald-300/50",
  medium: "border-l-blue-300/50",
  high: "border-l-amber-300/50",
  critical: "border-l-rose-300/60",
};
const statusMap = {
  investigating: ["running", "Investigating"],
  awaiting_review: ["review", "Awaiting review"],
  needs_review: ["review", "Needs review"],
  validation_failed: ["failure", "Validation failed"],
  pr_created: ["pr", "PR created"],
  rejected: ["failure", "Rejected"],
  failed: ["failure", "Failed"],
};

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function IncidentCard({ incident }) {
  const navigate = useNavigate();
  const {
    incident_id: incidentId,
    description = "No description provided",
    service = "Unknown service",
    severity = "unknown",
    status = "investigating",
    created_at: createdAt,
  } = incident || {};
  const [statusVariant, statusLabel] = statusMap[status] || ["neutral", status || "Unknown status"];

  return (
    <button type="button" onClick={() => navigate(`/incident/${encodeURIComponent(incidentId)}`)} className={`group flex w-full items-start gap-4 border-l-2 px-3 py-4 text-left hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-200 ${severityBorder[severity] || "border-l-transparent"}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-400">{incidentId ? `#${incidentId.slice(0, 8)}` : "Incident"}</span>
          <StatusBadge variant={severityMap[severity] || "neutral"}>{severity === "unknown" ? "Severity unknown" : severity}</StatusBadge>
        </div>
        <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-white">{description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span>{service}</span>
          {createdAt && <time dateTime={createdAt}>{timeAgo(createdAt)}</time>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
        <HiOutlineChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-200" aria-hidden="true" />
      </div>
    </button>
  );
}
