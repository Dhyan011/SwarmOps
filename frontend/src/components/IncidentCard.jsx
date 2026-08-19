import { useNavigate } from "react-router-dom";
import { HiOutlineChevronRight } from "react-icons/hi2";
import StatusBadge from "./StatusBadge";

const severityMap = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const severityBorder = {
  low: "severity-border-low",
  medium: "severity-border-medium",
  high: "severity-border-high",
  critical: "severity-border-critical",
};

const statusMap = {
  investigating: "running",
  resolved: "deployed",
  failed: "rejected",
  pending: "neutral",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default function IncidentCard({ incident, delay = 0 }) {
  const navigate = useNavigate();
  const {
    incident_id,
    description = "No description",
    service = "Unknown",
    severity = "medium",
    status = "investigating",
    created_at,
  } = incident || {};

  return (
    <div
      onClick={() => navigate(`/incident/${incident_id}`)}
      className={`
        glass-card group cursor-pointer
        px-5 py-4 flex items-center gap-4
        animate-fade-in card-3d
        ${severityBorder[severity] || "border-l-transparent"}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Severity indicator */}
      <div className="shrink-0">
        <StatusBadge variant={severityMap[severity] || "neutral"}>
          {severity}
        </StatusBadge>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base font-mono text-cyan-400">
            #{incident_id?.slice(0, 8)}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-base text-text-main font-medium">{service}</span>
        </div>
        <p className="text-base text-slate-300 truncate leading-relaxed">
          {description}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <StatusBadge variant={statusMap[status] || "neutral"}>
            {status === "investigating" ? "RUNNING" : status === "resolved" ? "DEPLOYED" : status}
          </StatusBadge>
          {created_at && (
            <p className="text-[11px] text-slate-400 mt-1.5">
              {timeAgo(created_at)}
            </p>
          )}
        </div>
        <HiOutlineChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors duration-200" />
      </div>
    </div>
  );
}
