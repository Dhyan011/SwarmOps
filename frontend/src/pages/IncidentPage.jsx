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
import { motion } from "framer-motion";

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

const severityVariant = {
  low: "info",
  medium: "warning",
  high: "danger",
  critical: "critical",
};

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
    } catch (e) {
      console.error(e);
    }
  };

  const isComplete = report || incident?.status === "resolved";
  const rootCause = report?.root_cause || "";
  const confidence = report?.confidence || 0;
  const patch = report?.code_patch || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 20 } }
  };

  return (
    <motion.div 
      className="max-w-[1400px] mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* MASSIVE MASTER CONSOLE WRAPPER */}
      <div className="bg-slate-950/90 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden text-black font-bold">
        
        {/* CONSOLE HEADER */}
        <div className="border-b border-white/10 bg-white/[0.02] px-8 py-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-black text-lg font-semibold hover:text-black font-bold hover:bg-white/10 transition-all duration-200"
            >
              <HiOutlineArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-xl font-mono text-blue-400 tracking-wider">
                  #{id?.slice(0, 8)}
                </span>
                <StatusBadge variant={isComplete ? "success" : "amber"} dot>
                  {isComplete ? "Investigation Complete" : "Investigation Active"}
                </StatusBadge>
              </div>
              <div className="flex items-center gap-4 text-base font-medium text-black text-lg font-semibold">
                <div className="flex items-center gap-1.5">
                  <HiOutlineServerStack className="w-4 h-4 text-black font-semibold text-base font-medium" />
                  {incident?.service || "Unknown Service"}
                </div>
                <div className="flex items-center gap-1.5">
                  <HiOutlineShieldCheck className="w-4 h-4 text-black font-semibold text-base font-medium" />
                  {incident?.severity ? incident.severity.toUpperCase() : "UNKNOWN"} SEVERITY
                </div>
                <div className="text-black font-semibold text-base font-medium">
                  {formatTimestamp(incident?.created_at)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button
                onClick={() => navigate(`/report/${id}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-base font-semibold text-black hover:bg-white/10 hover:text-black font-bold transition-all duration-200"
              >
                <HiOutlineDocumentArrowDown className="w-4 h-4" />
                Export Complete Report
              </button>
          </div>
        </div>

        {/* CONSOLE BODY */}
        <div className="p-8 space-y-10">
          
          {/* DESCRIPTION */}
          {incident?.description && (
            <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
               <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-2">Reported Incident</h3>
              <p className="text-lg text-black font-semibold font-mono">
                {incident.description}
              </p>
            </motion.div>
          )}

          {/* PIPELINE UI */}
          <motion.div variants={itemVariants}>
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-widest text-black font-semibold text-base font-medium mb-6">Multi-Agent Swarm Pipeline</h3>
              <AgentPipeline agents={agentStates} />
            </div>
          </motion.div>

          {/* TWO COLUMNS: FINDINGS & LIVE FEED */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-black font-semibold text-base font-medium mb-4 px-1">Agent Findings</h3>
              <FindingsPanel findings={findings} />
            </div>
            <div className="xl:col-span-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-black font-semibold text-base font-medium mb-4 px-1">Live WebSocket Feed</h3>
              <LiveFeed events={events} />
            </div>
          </motion.div>

          {/* RESOLUTION SECTION */}
          {isComplete && (
            <motion.div variants={itemVariants} className="mt-12 pt-10 border-t border-white/10 space-y-8">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Root Cause Card */}
                <div className="lg:col-span-1 bg-blue-500/5 border border-blue-500/20 rounded-3xl p-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-4">
                    Synthesized Root Cause
                  </h3>
                  <p className="text-base text-black leading-relaxed mb-6">
                    {rootCause || "No root cause synthesized."}
                  </p>
                  {confidence > 0 && (
                    <div className="pt-6 border-t border-blue-500/10">
                      <span className="text-sm font-bold text-black font-semibold text-base font-medium uppercase tracking-widest block mb-3">
                        Confidence Score
                      </span>
                      <ConfidenceMeter value={confidence} />
                    </div>
                  )}
                </div>

                {/* Code Diff Card */}
                <div className="lg:col-span-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-black font-semibold text-base font-medium mb-4 px-1">
                    Proposed Git Patch
                  </h3>
                  <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                     <CodeDiff patch={patch} />
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 mt-8">
                 <div>
                    <h4 className="text-base font-bold text-black font-bold mb-1">Investigation Completed</h4>
                    <p className="text-base text-black text-lg font-semibold">Review the root cause and proposed fix above. Approve to deploy the patch automatically.</p>
                 </div>
                 <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleAction("reject")}
                    disabled={incident?.status === "deployed" || incident?.status === "rejected"}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-black font-bold font-bold hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    <HiOutlineXCircle className="w-5 h-5" />
                    {incident?.status === "rejected" ? "Rejected" : "Reject Patch"}
                  </button>
                  <button 
                    onClick={() => handleAction("approve")}
                    disabled={incident?.status === "deployed" || incident?.status === "rejected"}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-amber-400 text-black font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] disabled:opacity-50"
                  >
                    <HiOutlineCheckCircle className="w-5 h-5" />
                    {incident?.status === "deployed" ? "Patch Deployed" : "Approve & Deploy Fix"}
                  </button>
                 </div>
              </div>

            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
