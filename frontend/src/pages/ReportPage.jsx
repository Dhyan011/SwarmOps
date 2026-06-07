import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowDownTray,
} from "react-icons/hi2";
import StatusBadge from "../components/StatusBadge";
import ConfidenceMeter from "../components/ConfidenceMeter";
import CodeDiff from "../components/CodeDiff";
import { getIncident } from "../services/api";
import { motion } from "framer-motion";

const AGENT_NAMES = [
  "triage",
  "log_analysis",
  "metrics_analysis",
  "trace_analysis",
  "security_scan",
  "root_cause",
  "fix_generation",
  "validation",
];

function formatAgentName(name) {
  if (!name) return "Unknown Agent";
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
}

function formatDate(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const severityVariant = {
  low: "info",
  medium: "warning",
  high: "danger",
  critical: "critical",
};

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getIncident(id)
      .then((res) => setIncident(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(incident, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swarmops-report-${id?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-700 font-semibold font-medium">Report not found.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-xl text-blue-400 hover:text-blue-300"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const report = incident.report || {};
  const rootCause = incident.root_cause || report.root_cause || "";
  const confidence = incident.confidence || report.confidence || 0;
  const patch = incident.code_patch || report.patch || "";
  const validationResult = incident.validation_result || report.validation || "";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <button
          onClick={() => navigate(id ? `/incident/${id}` : "/")}
          className="w-9 h-9 rounded-lg bg-white/40 shadow-sm border border-black/[0.1] flex items-center justify-center text-slate-700 hover:text-slate-900 hover:border-black/[0.1] transition-all duration-200"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleExport}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-white/40 shadow-sm border border-black/[0.1]
            text-xl font-medium text-slate-800 font-medium
            hover:bg-white/60 shadow-md hover:border-black/[0.15]
            transition-all duration-200
          "
        >
          <HiOutlineArrowDownTray className="w-4 h-4" />
          Export JSON
        </button>
      </motion.div>

      {/* Report Header Card */}
      <motion.div variants={itemVariants} className="glass-card p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-amber-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M7 20V16C7 12.134 10.134 9 14 9H17" />
              <circle cx="12" cy="20" r="2" fill="white" stroke="none" />
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text">SwarmOps</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Incident Report</h1>
        <p className="text-xl font-mono text-blue-400/80">#{id}</p>
      </motion.div>

      {/* Incident Summary */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-700 font-semibold font-medium mb-4">
          Incident Summary
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] text-slate-700 font-semibold uppercase tracking-wider">Service</span>
            <p className="text-xl text-slate-900 mt-1">{incident.service || "N/A"}</p>
          </div>
          <div>
            <span className="text-[11px] text-slate-700 font-semibold uppercase tracking-wider">Severity</span>
            <div className="mt-1">
              <StatusBadge variant={severityVariant[incident.severity] || "neutral"}>
                {incident.severity || "N/A"}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-700 font-semibold uppercase tracking-wider">Status</span>
            <div className="mt-1">
              <StatusBadge variant={incident.status === "resolved" ? "success" : "amber"} dot>
                {incident.status || "Unknown"}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[11px] text-slate-700 font-semibold uppercase tracking-wider">Created</span>
            <p className="text-xl text-slate-900 mt-1">{formatDate(incident.created_at)}</p>
          </div>
        </div>
        {incident.description && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <span className="text-[11px] text-slate-700 font-semibold uppercase tracking-wider">Description</span>
            <p className="text-xl text-slate-800 font-medium mt-1 leading-relaxed">{incident.description}</p>
          </div>
        )}
      </motion.div>

      {/* Timeline */}
      {incident.events && incident.events.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-700 font-semibold font-medium mb-4">
            Event Timeline
          </h2>
          <div className="space-y-3">
            {incident.events.map((event, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="pt-1.5">
                  <span className={`block w-2 h-2 rounded-full ${
                    event.status === "completed" ? "bg-emerald-400" :
                    event.status === "failed" ? "bg-red-400" :
                    "bg-blue-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xl text-slate-700 font-semibold font-medium">
                    <span className="font-semibold text-slate-700 uppercase tracking-wider">
                      {event.agent || "System"}
                    </span>
                    <span>·</span>
                    <span className="tabular-nums">{formatDate(event.timestamp)}</span>
                  </div>
                  <p className="text-xl text-slate-800 font-medium mt-0.5">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Agent Findings */}
      {(incident.agent_findings && incident.agent_findings.length > 0) && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-700 font-semibold font-medium mb-4">
            Agent Findings
          </h2>
          <div className="space-y-5">
            {incident.agent_findings.map((finding, idx) => (
              <div key={idx} className="border-b border-white/[0.04] last:border-0 pb-4 last:pb-0">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {formatAgentName(finding.agent_name)}
                </h3>
                <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {finding.finding}
                </p>
                {finding.metadata && Object.keys(finding.metadata).length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {Object.entries(finding.metadata).map(([key, val], i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700 font-semibold font-medium">
                        <span className="text-blue-500 shrink-0">→</span>
                        <span className="font-semibold">{key}:</span> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Root Cause + Confidence */}
      {rootCause && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-700 font-semibold font-medium mb-4">
            Root Cause
          </h2>
          <p className="text-xl text-slate-900 leading-relaxed mb-4 whitespace-pre-wrap">{rootCause}</p>
          {confidence > 0 && (
            <div>
              <span className="text-[11px] text-slate-700 font-semibold font-medium uppercase tracking-wider font-medium">
                Confidence
              </span>
              <div className="mt-2 max-w-sm">
                <ConfidenceMeter value={confidence} />
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Proposed Fix */}
      {patch && (
        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-700 font-semibold font-medium mb-3 px-1">
            Proposed Fix
          </h2>
          <CodeDiff patch={patch} />
        </motion.div>
      )}

      {/* Validation */}
      {validationResult && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-700 font-semibold font-medium mb-4">
            Validation Result
          </h2>
          <p className="text-xl text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
            {validationResult}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
