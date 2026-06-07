import { useState, useEffect } from "react";
import {
  HiOutlineChevronDown,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
} from "react-icons/hi2";
import StatusBadge from "./StatusBadge";

const statusConfig = {
  completed: { variant: "success", icon: HiOutlineCheckCircle, label: "Completed" },
  running: { variant: "info", icon: HiOutlineClock, label: "Running" },
  failed: { variant: "danger", icon: HiOutlineXCircle, label: "Failed" },
  idle: { variant: "neutral", icon: HiOutlineClock, label: "Pending" },
};

function formatAgentName(name) {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function FindingSection({ finding, isLatest }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[finding.status] || statusConfig.idle;
  const StatusIcon = config.icon;

  // Auto-expand the latest completed agent
  useEffect(() => {
    if (isLatest && finding.status === "completed") {
      setExpanded(true);
    }
  }, [isLatest, finding.status]);

  return (
    <div
      className={`
        border border-white/[0.08] rounded-xl overflow-hidden
        transition-all duration-200
        ${expanded ? "bg-white/[0.02]" : "hover:bg-white/[0.015]"}
        ${finding.status === "completed" ? "animate-slide-in" : ""}
      `}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left group"
      >
        <StatusIcon
          className={`w-4.5 h-4.5 shrink-0 ${
            finding.status === "completed"
              ? "text-emerald-400"
              : finding.status === "running"
              ? "text-blue-400"
              : finding.status === "failed"
              ? "text-red-400"
              : "text-slate-200"
          }`}
        />
        <span className="flex-1 text-base font-medium text-white font-bold">
          {formatAgentName(finding.agent)}
        </span>
        <StatusBadge variant={config.variant}>{config.label}</StatusBadge>
        <HiOutlineChevronDown
          className={`w-4 h-4 text-slate-200 font-medium transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="border-t border-white/[0.04] pt-4">
            {/* Findings text */}
            {finding.findings && (
              <div className="mb-4">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-200 font-medium mb-2">
                  Findings
                </h4>
                <p className="text-[13px] text-white leading-relaxed whitespace-pre-wrap">
                  {finding.findings}
                </p>
              </div>
            )}

            {/* Recommendations */}
            {finding.recommendations && finding.recommendations.length > 0 && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-200 font-medium mb-2">
                  Recommendations
                </h4>
                <ul className="space-y-1.5">
                  {finding.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-white text-lg font-semibold">
                      <span className="text-blue-500 mt-0.5 shrink-0">→</span>
                      <span className="leading-relaxed">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty state for running/idle */}
            {!finding.findings && finding.status === "running" && (
              <div className="flex items-center gap-2 text-base text-slate-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse-dot" />
                Agent is currently processing...
              </div>
            )}
            {!finding.findings && finding.status === "idle" && (
              <p className="text-base text-slate-200">Waiting to start...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FindingsPanel({ findings = [] }) {
  // Find the index of the latest completed agent
  const latestCompletedIdx = [...findings]
    .map((f, i) => ({ ...f, idx: i }))
    .filter((f) => f.status === "completed")
    .pop()?.idx;

  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold uppercase tracking-wider text-slate-200 font-medium mb-3 px-1">
        Agent Findings
      </h3>
      {findings.length === 0 ? (
        <div className="text-base text-slate-200 py-8 text-center">
          No findings yet — agents haven't started.
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((finding, i) => (
            <FindingSection
              key={finding.agent || i}
              finding={finding}
              isLatest={i === latestCompletedIdx}
            />
          ))}
        </div>
      )}
    </div>
  );
}
