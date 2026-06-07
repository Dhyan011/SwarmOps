import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineBolt,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineCheckBadge,
  HiOutlineChevronDown,
  HiOutlineCodeBracket,
  HiOutlineInboxStack,
} from "react-icons/hi2";
import { motion } from "framer-motion";
import MetricCard from "../components/MetricCard";
import IncidentCard from "../components/IncidentCard";
import EmptyState from "../components/EmptyState";
import { createIncident, getIncidents } from "../services/api";
import { useIncident } from "../context/IncidentContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { incidents, setIncidents } = useIncident();
  const [description, setDescription] = useState("");
  const [service, setService] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [analysisMode, setAnalysisMode] = useState("full");
  const [showCode, setShowCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch incidents on mount
  useEffect(() => {
    getIncidents()
      .then((res) => {
        const data = res.data;
        setIncidents(Array.isArray(data) ? data : data?.incidents || []);
      })
      .catch(() => {
        // Backend not available — use empty state
      });
  }, [setIncidents]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        description: description.trim(),
        service: service.trim() || "unknown",
        severity,
        analysis_mode: analysisMode
      };
      if (codeSnippet.trim()) {
        payload.code_snippet = codeSnippet.trim();
      }
      if (targetUrl.trim()) {
        payload.target_url = targetUrl.trim();
      }

      const res = await createIncident(payload);
      const id = res.data?.incident_id || res.data?.id;
      if (id) {
        navigate(`/incident/${id}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to create incident. Is the backend running?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants}>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          <span className="gradient-text">Command Center</span>
        </h1>
        <p className="text-sm text-black text-lg font-semibold max-w-xl leading-relaxed">
          Monitor, investigate, and resolve incidents with AI-powered agent swarms.
        </p>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Incidents"
          value={incidents.length}
          icon={HiOutlineBolt}
          trend={incidents.length > 0 ? "up" : "none"}
          trendValue={incidents.length > 0 ? "+1 recent" : "No data yet"}
          delay={0}
        />
        <MetricCard
          label="Avg Resolution"
          value={incidents.length ? Math.round(incidents.reduce((acc, inc) => acc + (inc.resolution_time_ms || 0), 0) / incidents.length / 1000 / 60 * 10) / 10 : 0}
          suffix="min"
          icon={HiOutlineClock}
          trend="none"
          trendValue="Based on history"
          delay={80}
        />
        <MetricCard
          label="Active Agents"
          value={8}
          suffix="/8"
          icon={HiOutlineCpuChip}
          trend="up"
          trendValue="All systems nominal"
          delay={160}
        />
        <MetricCard
          label="Success Rate"
          value={incidents.length ? Math.round(incidents.filter(i => i.status === "resolved" || i.status === "deployed").length / incidents.length * 100) : 100}
          suffix="%"
          icon={HiOutlineCheckBadge}
          trend="none"
          trendValue="Overall resolution rate"
          delay={240}
        />
      </motion.div>

      {/* New Incident Panel */}
      <motion.div variants={itemVariants} className="glass-card p-6 lg:p-8">
        <h2 className="text-sm font-semibold text-black font-bold mb-1">
          Launch Investigation
        </h2>
        <p className="text-sm text-slate-600 font-medium mb-6">
          Describe the incident and deploy an AI agent swarm to investigate.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident or paste error logs..."
              rows={4}
              className="
                w-full px-4 py-3 rounded-xl
                bg-white/[0.03] border border-white/[0.08]
                text-sm text-black font-bold placeholder-slate-600
                focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20
                resize-none transition-all duration-200
              "
            />
          </div>

          {/* Service + Severity row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 font-medium mb-2">
                Service Name
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. payment-service"
                className="
                  w-full px-4 py-2.5 rounded-lg
                  bg-white/[0.03] border border-white/[0.08]
                  text-sm text-black font-bold placeholder-slate-600
                  focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20
                  transition-all duration-200
                "
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 font-medium mb-2">
                Severity
              </label>
              <div className="relative">
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="
                    w-full px-4 py-2.5 rounded-lg appearance-none
                    bg-white/[0.03] border border-white/[0.08]
                    text-sm text-black font-bold
                    focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20
                    transition-all duration-200 cursor-pointer
                  "
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <HiOutlineChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 font-medium pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Target URL */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 font-medium mb-2">
              Investigation Target URL (GitHub Repo or Website)
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://github.com/user/repo or https://example.com"
              className="
                w-full px-4 py-2.5 rounded-lg
                bg-white/[0.03] border border-white/[0.08]
                text-sm text-black font-bold placeholder-slate-600
                focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20
                transition-all duration-200
              "
            />
          </div>

          {/* Analysis Mode Toggle (only show if URL provided) */}
          {targetUrl && (
            <div className="animate-fade-in">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 font-medium mb-2">
                Analysis Mode
              </label>
              <div className="flex bg-white/[0.03] rounded-lg p-1 border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setAnalysisMode("full")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    analysisMode === "full"
                      ? "bg-blue-500/20 text-blue-400 shadow-sm"
                      : "text-black text-lg font-semibold hover:text-black font-bold"
                  }`}
                >
                  Full Context Injection
                </button>
                <button
                  type="button"
                  onClick={() => setAnalysisMode("agentic")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    analysisMode === "agentic"
                      ? "bg-blue-500/20 text-blue-400 shadow-sm"
                      : "text-black text-lg font-semibold hover:text-black font-bold"
                  }`}
                >
                  Agentic File Fetching
                </button>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-2">
                {analysisMode === "full" 
                  ? "Packs the entire repository into the agent prompt (best for small/medium repos)."
                  : "Agents selectively fetch specific files via tools (best for massive monorepos)."}
              </p>
            </div>
          )}

          {/* Code snippet (collapsible) */}
          <div>
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 font-medium hover:text-black transition-colors duration-200"
            >
              <HiOutlineCodeBracket className="w-4 h-4" />
              {showCode ? "Hide Code Snippet" : "Attach Code Snippet"}
              <HiOutlineChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${showCode ? "rotate-180" : ""}`}
              />
            </button>
            {showCode && (
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Paste relevant code here..."
                rows={5}
                className="
                  w-full mt-3 px-4 py-3 rounded-xl
                  bg-white/[0.03] border border-white/[0.08]
                  text-sm text-black font-bold placeholder-slate-600 font-mono
                  focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20
                  resize-none transition-all duration-200 animate-fade-in
                "
              />
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 animate-fade-in">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !description.trim()}
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-blue-500 to-blue-400
              text-sm font-semibold text-black
              hover:shadow-[0_0_30px_rgba(34,211,238,0.3)]
              active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
              transition-all duration-200
            "
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Deploying...
              </>
            ) : (
              <>Deploy Agent Swarm →</>
            )}
          </button>
        </form>
      </motion.div>

      {/* Recent Incidents */}
      <motion.div variants={itemVariants}>
        <h2 className="text-sm font-semibold text-black font-bold mb-4">
          Recent Investigations
        </h2>
        {incidents.length > 0 ? (
          <div className="space-y-3">
            {incidents.slice(0, 10).map((inc, i) => (
              <IncidentCard key={inc.incident_id || i} incident={inc} delay={i * 60} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No investigations yet"
            description="Launch your first agent swarm investigation above to get started."
            icon={HiOutlineInboxStack}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
