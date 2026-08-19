import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineDocumentArrowDown,
  HiOutlineServerStack,
  HiOutlineShieldCheck
} from "react-icons/hi2";
import AgentPipeline from "../components/AgentPipeline";
import LiveFeed from "../components/LiveFeed";
import FindingsPanel from "../components/FindingsPanel";
import CodeDiff from "../components/CodeDiff";
import ConfidenceMeter from "../components/ConfidenceMeter";
import StatusBadge from "../components/StatusBadge";
import { getIncident, handleIncidentAction } from "../services/api";
import useAgentSocket from "../hooks/useAgentSocket";
import { useIncident } from "../context/IncidentContext";
import { motion, AnimatePresence } from "framer-motion";

const AGENT_NAMES = [
  "TriageAgent",
  "LogAnalyzerAgent",
  "MetricsAgent",
  "TraceAgent",
  "SecurityAgent",
  "RootCauseAgent",
  "FixGeneratorAgent",
  "ValidationAgent",
];

function formatTimestamp(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function IncidentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveIncident } = useIncident();

  const [incident, setIncident] = useState(null);
  const [events, setEvents] = useState([]);
  const [agentStates, setAgentStates] = useState(
    AGENT_NAMES.map((name) => ({ name, status: "idle" }))
  );
  const [findings, setFindings] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch incident data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getIncident(id)
      .then((res) => {
        const data = res.data;
        setIncident(data);
        setActiveIncident(data);

        if (data?.status === "resolved" || data?.agent_findings?.length > 0) {
          setReport(data);
          populateFromReport(data);
        }
        if (data?.events) {
          setEvents(data.events);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, setActiveIncident]);

  const populateFromReport = (rpt) => {
    if (!rpt) return;
    const newStates = AGENT_NAMES.map((name) => {
      const agentData = rpt.agent_findings?.find(f => f.agent_name === name);
      return { name, status: agentData ? agentData.status : "idle" };
    });
    setAgentStates(newStates);

    const newFindings = AGENT_NAMES.map((name) => {
      const agentData = rpt.agent_findings?.find(f => f.agent_name === name);
      return {
        agent: name,
        status: agentData ? agentData.status : "idle",
        findings: agentData?.findings || "",
        recommendations: agentData?.recommendations || [],
      };
    }).filter((f) => f.findings || f.status !== "idle");
    setFindings(newFindings);
  };

  const handleEvent = useCallback((event) => {
    setEvents((prev) => [...prev, event]);
    if (event.agent) {
      setAgentStates((prev) =>
        prev.map((a) =>
          a.name === event.agent
            ? { ...a, status: event.status === "completed" ? "completed" : event.status === "failed" ? "failed" : "running" }
            : a
        )
      );
      if (event.status === "completed" && (event.findings || event.message)) {
        setFindings((prev) => {
          const existing = prev.find((f) => f.agent === event.agent);
          if (existing) {
            return prev.map((f) =>
              f.agent === event.agent
                ? { ...f, status: "completed", findings: event.findings || event.message || f.findings, recommendations: event.recommendations || f.recommendations }
                : f
            );
          }
          return [...prev, { agent: event.agent, status: "completed", findings: event.findings || event.message || "", recommendations: event.recommendations || [] }];
        });
      }
    }

    if (event.agent === "validation" && event.status === "completed") {
      setTimeout(() => {
        getIncident(id).then((res) => {
          if (res.data?.status === "resolved" || res.data?.agent_findings?.length > 0) {
            setReport(res.data);
            setIncident(res.data);
          }
        }).catch(() => {});
      }, 1000);
    }
  }, [id]);

  useAgentSocket(id, handleEvent);

  useEffect(() => {
    if (!id) return;
    const isComplete = ["resolved", "deployed", "rejected", "failed", "validation_failed"].includes(report?.status);
    if (isComplete) return;

    const interval = setInterval(() => {
      getIncident(id).then((res) => {
        if (res.data) {
          setIncident(res.data);
          if ((res.data.status === "resolved" || res.data.agent_findings?.length > 0) && !report) {
            setReport(res.data);
            populateFromReport(res.data);
          }
        }
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [id, report]);

  const handleAction = async (action) => {
    try {
      await handleIncidentAction(id, action);
      // Fetch latest state after action
      const res = await getIncident(id);
      setIncident(res.data);
      if (res.data.status === "resolved" || res.data.agent_findings?.length > 0) {
        setReport(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isComplete = report || incident?.status === "resolved" || incident?.status === "deployed" || incident?.status === "rejected";
  const rootCause = report?.root_cause || "";
  const confidence = report?.confidence || 0;
  const patch = report?.code_patch || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 20 } }
  };

  return (
    <motion.div 
      className="h-[calc(100vh-6rem)] flex flex-col w-full -m-6 p-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* HEADER ROW */}
      <div className="flex items-center justify-between mb-6 shrink-0 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-cyan-400 tracking-wider">
                #{id?.slice(0, 8)}
              </span>
              <StatusBadge variant={isComplete ? "deployed" : "running"}>
                {incident?.status === "investigating" ? "RUNNING" : incident?.status === "resolved" ? "RESOLVED" : incident?.status === "deployed" ? "DEPLOYED" : incident?.status === "rejected" ? "REJECTED" : incident?.status}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">
              <div className="flex items-center gap-1">
                <HiOutlineServerStack className="w-4 h-4" />
                {incident?.service || "Unknown Service"}
              </div>
              <div className="flex items-center gap-1">
                <HiOutlineShieldCheck className="w-4 h-4" />
                {incident?.severity}
              </div>
              <div>{formatTimestamp(incident?.created_at)}</div>
            </div>
          </div>
        </div>
        
        {isComplete && (
          <button
            onClick={() => navigate(`/report/${id}`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors text-sm"
          >
            <HiOutlineDocumentArrowDown className="w-4 h-4" />
            Export Report
          </button>
        )}
      </div>

      {/* 3-COLUMN SPLIT LAYOUT */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN (30%): Live Feed & Findings */}
        <div className="w-full lg:w-[30%] flex flex-col gap-6 min-h-0 overflow-y-auto no-scrollbar pb-6 pr-2">
          {incident?.description && (
            <motion.div variants={itemVariants} className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 shrink-0">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400 mb-2">Reported Incident</h3>
              <p className="text-sm text-white font-medium font-mono leading-relaxed">
                {incident.description}
              </p>
            </motion.div>
          )}

          <motion.div variants={itemVariants} className="shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">Agent Findings</h3>
            <div className="bg-black/20 rounded-2xl border border-white/5 p-4 max-h-[40vh] overflow-y-auto no-scrollbar">
              <FindingsPanel findings={findings} />
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex-1 min-h-0 flex flex-col">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">Live Feed</h3>
            <div className="flex-1 bg-black/20 rounded-2xl border border-white/5 p-4 overflow-hidden relative min-h-[300px]">
              {/* Fade out top and bottom */}
              <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-bg-dark to-transparent z-10 pointer-events-none rounded-t-2xl" />
              <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-bg-dark to-transparent z-10 pointer-events-none rounded-b-2xl" />
              <div className="h-full overflow-y-auto no-scrollbar pb-10 pt-4">
                <LiveFeed events={events} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* MIDDLE COLUMN (40%): Pipeline DAG & Root Cause */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6 min-h-0 overflow-y-auto no-scrollbar pb-6">
          <motion.div variants={itemVariants} className="shrink-0">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 px-1">Swarm Topology</h3>
            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
              <AgentPipeline agents={agentStates} />
            </div>
          </motion.div>

          <AnimatePresence>
            {(rootCause || isComplete) && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6 min-h-[300px]"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4">
                  Synthesized Root Cause
                </h3>
                <div className="flex-1 overflow-y-auto no-scrollbar text-sm text-slate-300 leading-relaxed font-medium">
                  {rootCause || "Analyzing root cause... (This may take a moment after execution completes)"}
                </div>
                {confidence > 0 && (
                  <div className="mt-6 pt-6 border-t border-indigo-500/10">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block mb-3">
                      Confidence Score
                    </span>
                    <ConfidenceMeter value={confidence} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN (30%): Code Diff & Action Bar */}
        <div className="w-full lg:w-[30%] flex flex-col gap-6 min-h-0 pb-6 pr-2">
          <AnimatePresence>
            {(patch || isComplete) && (
              <>
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 min-h-0 flex flex-col bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="p-4 border-b border-white/5 bg-black/60 shrink-0">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      Proposed Git Patch
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar bg-[#0d1117]">
                    {patch ? (
                      <CodeDiff patch={patch} />
                    ) : (
                      <div className="h-full flex items-center justify-center p-6 text-center text-sm font-bold text-slate-500">
                        {incident?.status === "investigating" ? "Waiting for fix generation..." : "No code changes proposed."}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* ACTION BAR */}
                {patch && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="shrink-0 bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 backdrop-blur-md card-3d"
                  >
                    <div className="text-center">
                      <h4 className="text-sm font-bold text-white mb-1">Investigation Completed</h4>
                      <p className="text-xs font-bold text-slate-400">Review the root cause and proposed fix. Approve to deploy the patch automatically.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button 
                        onClick={() => handleAction("reject")}
                        disabled={incident?.status === "deployed" || incident?.status === "rejected"}
                        className={`
                          flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
                          ${incident?.status === "rejected" ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-black/50 text-white border border-white/10 hover:bg-white/10"}
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <HiOutlineXCircle className="w-5 h-5" />
                        {incident?.status === "rejected" ? "Rejected" : "Reject"}
                      </button>
                      <button 
                        onClick={() => handleAction("approve")}
                        disabled={incident?.status === "deployed" || incident?.status === "rejected"}
                        className={`
                          flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all shadow-glow-cyan
                          ${incident?.status === "deployed" ? "bg-emerald-500 text-white shadow-glow-emerald border-emerald-400" : "btn-primary"}
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                        `}
                      >
                        <HiOutlineCheckCircle className="w-5 h-5" />
                        {incident?.status === "deployed" ? "Deployed" : "Approve Fix"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>

      </div>
    </motion.div>
  );
}
