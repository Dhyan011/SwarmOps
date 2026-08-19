import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowDownTray,
  HiOutlineDocumentText,
  HiOutlineLightBulb,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineCodeBracket
} from "react-icons/hi2";
import StatusBadge from "../components/StatusBadge";
import ConfidenceMeter from "../components/ConfidenceMeter";
import CodeDiff from "../components/CodeDiff";
import { getIncident } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";

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
    month: "short",
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
  const [activeTab, setActiveTab] = useState("summary");

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
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 font-bold">Report not found.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-indigo-400 hover:text-indigo-300 font-bold"
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
                <div key={key} className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <span className="block text-indigo-400 font-bold mb-2 tracking-wide uppercase text-[10px]">{formattedKey}</span>
                  <div className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-medium">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    } catch (e) {}
    return <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap mt-3 font-medium">{findingsText}</p>;
  };

  const tabs = [
    { id: "summary", label: "Executive Summary", icon: HiOutlineDocumentText },
    { id: "rootcause", label: "Root Cause", icon: HiOutlineLightBulb },
    { id: "timeline", label: "Timeline", icon: HiOutlineClock },
    { id: "trace", label: "Agent Trace", icon: HiOutlineCpuChip },
    { id: "diffs", label: "Code Diffs", icon: HiOutlineCodeBracket },
  ];

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(id ? `/incident/${id}` : "/")}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white tracking-tight">Incident Report</span>
              <span className="text-lg font-bold text-cyan-400 font-mono tracking-wider">#{id?.slice(0, 8)}</span>
            </div>
            <p className="text-sm text-slate-400 font-bold mt-1">Generated by SwarmOps Autonomous Agents</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-lg bg-white/5 text-white font-bold border border-white/10 hover:bg-white/10 transition-colors text-sm">
            Share Link
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg btn-primary text-white font-bold text-sm shadow-glow-indigo transition-transform"
          >
            <HiOutlineArrowDownTray className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 shrink-0 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" 
                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area (markdown-body) */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pb-12 markdown-body">
        <AnimatePresence mode="wait">
          
          {/* SUMMARY TAB */}
          {activeTab === "summary" && (
            <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="glass-card p-8">
                <h2 className="text-lg font-bold uppercase tracking-widest text-slate-300 mb-6 border-b border-white/10 pb-3">
                  Incident Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Service</span>
                    <p className="text-base text-white font-bold mt-1">{incident.service || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Severity</span>
                    <div className="mt-1">
                      <StatusBadge variant={severityVariant[incident.severity] || "neutral"}>
                        {incident.severity || "N/A"}
                      </StatusBadge>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Final Status</span>
                    <div className="mt-1">
                      <StatusBadge variant={incident.status === "resolved" || incident.status === "deployed" ? "deployed" : incident.status === "failed" || incident.status === "rejected" ? "rejected" : "running"}>
                        {incident.status === "investigating" ? "RUNNING" : incident.status === "resolved" ? "RESOLVED" : incident.status === "deployed" ? "DEPLOYED" : incident.status === "rejected" ? "REJECTED" : incident.status}
                      </StatusBadge>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Created</span>
                    <p className="text-base text-white font-bold mt-1">{formatDate(incident.created_at)}</p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Reported Description</span>
                  <p className="text-sm text-slate-300 font-medium mt-3 leading-relaxed font-mono bg-black/20 p-4 rounded-xl border border-white/5">{incident.description}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ROOT CAUSE TAB */}
          {activeTab === "rootcause" && (
            <motion.div key="rootcause" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="glass-card p-8">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-3">
                  <h2 className="text-lg font-bold uppercase tracking-widest text-slate-300">
                    Synthesized Root Cause
                  </h2>
                  {confidence > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Confidence</span>
                      <div className="w-32"><ConfidenceMeter value={confidence} /></div>
                    </div>
                  )}
                </div>
                <div className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {rootCause || "No root cause synthesized."}
                </div>
              </div>

              {validationResult && (
                <div className="glass-card p-8 border-emerald-500/20 bg-emerald-500/5">
                  <h2 className="text-lg font-bold uppercase tracking-widest text-emerald-400 mb-4 border-b border-emerald-500/10 pb-3">
                    Validation Result
                  </h2>
                  <div className="text-sm text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                    {validationResult}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="glass-card p-8">
                <h2 className="text-lg font-bold uppercase tracking-widest text-slate-300 mb-8 border-b border-white/10 pb-3">
                  Execution Timeline
                </h2>
                {incident.events && incident.events.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                    {incident.events.map((event, i) => (
                      <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        {/* Icon */}
                        <div className={`
                          flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow
                          ${event.status === "completed" ? "bg-emerald-500" : event.status === "failed" ? "bg-rose-500" : "bg-cyan-500"}
                        `}>
                        </div>
                        {/* Card */}
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 p-4 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-white uppercase tracking-wider text-[10px]">{event.agent || "System"}</span>
                            <span className="font-mono text-slate-500 text-[10px] font-bold">{formatDate(event.timestamp)}</span>
                          </div>
                          <p className="text-sm text-slate-300 font-medium">{event.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm font-bold">No events recorded.</p>
                )}
              </div>
            </motion.div>
          )}

          {/* AGENT TRACE TAB */}
          {activeTab === "trace" && (
            <motion.div key="trace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-6">
                {incident.agent_findings && incident.agent_findings.length > 0 ? (
                  incident.agent_findings.map((finding, idx) => (
                    <div key={idx} className="glass-card p-8">
                      <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 border-b border-white/10 pb-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
                          <span className="text-indigo-400 text-sm">{idx + 1}</span>
                        </div>
                        {formatAgentName(finding.agent_name)}
                      </h3>
                      {renderFindings(finding.findings)}
                      
                      {finding.recommendations && finding.recommendations.length > 0 && (
                        <div className="mt-6 bg-indigo-500/5 p-6 rounded-xl border border-indigo-500/10">
                          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">
                            Proposed Recommendations
                          </h4>
                          <ul className="space-y-3">
                            {finding.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                                <span className="text-indigo-500 shrink-0 mt-0.5">→</span>
                                <span className="leading-relaxed">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="glass-card p-8 text-center">
                    <p className="text-slate-400 font-bold">No agent trace data available.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* DIFFS TAB */}
          {activeTab === "diffs" && (
            <motion.div key="diffs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {patch ? (
                <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                   <div className="p-4 border-b border-white/5 bg-black/60">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Proposed Git Patch
                    </h3>
                  </div>
                  <CodeDiff patch={patch} />
                </div>
              ) : (
                <div className="glass-card p-12 text-center border-dashed">
                  <HiOutlineCodeBracket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">No code diffs proposed for this incident.</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
