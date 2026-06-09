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
        <p className="text-slate-200 font-semibold font-medium">Report not found.</p>
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

  const renderFindings = (findingsText) => {
    if (!findingsText) return null;
    try {
      const parsed = JSON.parse(findingsText);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return (
          <div className="space-y-4 mt-3">
            {Object.entries(parsed).map(([key, value]) => {
              if (key.startsWith('_') || key === 'recommendations' || value === null || value === '') return null;
              const formattedKey = key
                .split('_')
                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
              return (
                <div key={key} className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.05]">
                  <span className="block text-blue-400 font-bold mb-2 tracking-wide uppercase text-[11px]">{formattedKey}</span>
                  <div className="text-white text-[15px] whitespace-pre-wrap leading-relaxed">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, just render text
    }
    return <p className="text-[15px] text-white leading-relaxed whitespace-pre-wrap mt-3">{findingsText}</p>;
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-8 pb-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <button
          onClick={() => navigate(id ? `/incident/${id}` : "/")}
          className="w-9 h-9 rounded-lg bg-white/40 shadow-sm border border-black/[0.1] flex items-center justify-center text-slate-800 font-bold hover:text-black hover:border-black/[0.2] transition-all duration-200"
        >
          <HiOutlineArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={handleExport}
          className="
            inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-white/40 shadow-sm border border-black/[0.1]
            text-[15px] font-bold text-slate-800
            hover:bg-white/60 shadow-md hover:border-black/[0.15]
            transition-all duration-200
          "
        >
          <HiOutlineArrowDownTray className="w-5 h-5" />
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
        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Incident Report</h1>
        <p className="text-[17px] font-mono text-blue-400 font-bold tracking-wider">#{id}</p>
      </motion.div>

      {/* Incident Summary */}
      <motion.div variants={itemVariants} className="glass-card p-8">
        <h2 className="text-lg font-bold uppercase tracking-wider text-slate-300 mb-6 border-b border-white/[0.05] pb-3">
          Incident Summary
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Service</span>
            <p className="text-[17px] text-white font-bold mt-1">{incident.service || "N/A"}</p>
          </div>
          <div>
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Severity</span>
            <div className="mt-1">
              <StatusBadge variant={severityVariant[incident.severity] || "neutral"}>
                {incident.severity || "N/A"}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Status</span>
            <div className="mt-1">
              <StatusBadge variant={incident.status === "resolved" ? "success" : "amber"} dot>
                {incident.status || "Unknown"}
              </StatusBadge>
            </div>
          </div>
          <div>
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Created</span>
            <p className="text-[17px] text-white font-bold mt-1">{formatDate(incident.created_at)}</p>
          </div>
        </div>
        {incident.description && (
          <div className="mt-6 pt-6 border-t border-white/[0.05]">
            <span className="text-[12px] text-slate-400 font-bold uppercase tracking-wider">Description</span>
            <p className="text-[17px] text-white font-semibold mt-2 leading-relaxed">{incident.description}</p>
          </div>
        )}
      </motion.div>

      {/* Timeline */}
      {incident.events && incident.events.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card p-8">
          <h2 className="text-lg font-bold uppercase tracking-wider text-slate-300 mb-6 border-b border-white/[0.05] pb-3">
            Event Timeline
          </h2>
          <div className="space-y-4">
            {incident.events.map((event, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="pt-2">
                  <span className={`block w-2.5 h-2.5 rounded-full ${
                    event.status === "completed" ? "bg-emerald-400" :
                    event.status === "failed" ? "bg-red-400" :
                    "bg-blue-400"
                  }`} />
                </div>
                <div className="flex-1 bg-white/[0.01] p-3 rounded-lg border border-white/[0.03]">
                  <div className="flex items-center gap-2 text-[13px] text-slate-300">
                    <span className="font-bold text-white uppercase tracking-wider">
                      {event.agent || "System"}
                    </span>
                    <span>•</span>
                    <span className="tabular-nums font-mono text-slate-400">{formatDate(event.timestamp)}</span>
                  </div>
                  <p className="text-[15px] text-white font-medium mt-1.5">{event.message}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detailed Agent Analysis (Replaces old Agent Findings) */}
      {(incident.agent_findings && incident.agent_findings.length > 0) && (
        <motion.div variants={itemVariants} className="glass-card p-8">
          <h2 className="text-lg font-bold uppercase tracking-wider text-slate-300 mb-6 border-b border-white/[0.05] pb-3">
            Detailed Problem & Solution Analysis
          </h2>
          <div className="space-y-8">
            {incident.agent_findings.map((finding, idx) => (
              <div key={idx} className="border-b border-white/[0.05] last:border-0 pb-8 last:pb-0">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <span className="text-blue-400 text-sm">{idx + 1}</span>
                  </div>
                  {formatAgentName(finding.agent_name)}
                </h3>
                {renderFindings(finding.findings)}
                
                {finding.recommendations && finding.recommendations.length > 0 && (
                  <div className="mt-6 bg-blue-500/5 p-5 rounded-xl border border-blue-500/10">
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-blue-400 mb-3">
                      Proposed Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {finding.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 text-[15px] text-white font-medium">
                          <span className="text-blue-500 shrink-0 mt-0.5">→</span>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Root Cause + Confidence */}
      {rootCause && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-200 font-semibold font-medium mb-4">
            Root Cause
          </h2>
          <p className="text-xl text-white leading-relaxed mb-4 whitespace-pre-wrap">{rootCause}</p>
          {confidence > 0 && (
            <div>
              <span className="text-[11px] text-slate-200 font-semibold font-medium uppercase tracking-wider font-medium">
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
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-200 font-semibold font-medium mb-3 px-1">
            Proposed Fix
          </h2>
          <CodeDiff patch={patch} />
        </motion.div>
      )}

      {/* Validation */}
      {validationResult && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <h2 className="text-xl font-semibold uppercase tracking-wider text-slate-200 font-semibold font-medium mb-4">
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
