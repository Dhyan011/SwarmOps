import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiOutlineChevronDown,
  HiOutlineCodeBracket,
  HiOutlineBolt,
  HiOutlineServerStack
} from "react-icons/hi2";
import { createIncident } from "../services/api";
import { useIncident } from "../context/IncidentContext";

export default function NewIncidentPage() {
  const navigate = useNavigate();
  const { setIncidents } = useIncident();
  
  const [description, setDescription] = useState("");
  const [service, setService] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [analysisMode, setAnalysisMode] = useState("full");
  const [showCode, setShowCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      const data = res.data;
      if (data) {
        setIncidents((prev) => [data, ...prev]);
        navigate(`/incident/${data.incident_id || data.id}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Failed to launch swarm. Is the backend running?"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          <span className="gradient-text">Launch Swarm</span>
        </h1>
        <p className="text-lg text-slate-300 font-semibold max-w-xl leading-relaxed">
          Configure incident parameters and deploy autonomous agents to investigate and resolve.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }}
        className="glass-card p-6 lg:p-10 card-3d relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          
          {/* Main Description */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-200">
              <span className="text-indigo-400 mr-2">01.</span> Incident Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 500 internal server errors spiking on checkout API, traceback shows NullPointerException in payment router..."
              rows={5}
              className="
                w-full px-5 py-4 rounded-xl
                bg-black/30 border border-white/10
                text-base text-white font-medium placeholder-slate-500
                focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                resize-none transition-all duration-300 shadow-inner
              "
            />
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          {/* Context Target */}
          <div className="space-y-6">
            <label className="block text-sm font-bold text-slate-200">
              <span className="text-indigo-400 mr-2">02.</span> Investigation Target
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Target Service / Component
                </label>
                <div className="relative">
                  <HiOutlineServerStack className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="e.g. payment-service"
                    className="
                      w-full pl-11 pr-4 py-3 rounded-lg
                      bg-black/30 border border-white/10
                      text-sm text-white font-medium placeholder-slate-500
                      focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                      transition-all duration-300
                    "
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Severity Level
                </label>
                <div className="relative">
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="
                      w-full px-4 py-3 rounded-lg appearance-none
                      bg-black/30 border border-white/10
                      text-sm text-white font-medium
                      focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                      transition-all duration-300 cursor-pointer
                    "
                  >
                    <option value="low">Low - Minor Annoyance</option>
                    <option value="medium">Medium - Partial Degradation</option>
                    <option value="high">High - Core Feature Broken</option>
                    <option value="critical">Critical - System Outage</option>
                  </select>
                  <HiOutlineChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://github.com/organization/repository"
                className="
                  w-full px-4 py-3 rounded-lg
                  bg-black/30 border border-white/10
                  text-sm text-white font-medium placeholder-slate-500
                  focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                  transition-all duration-300
                "
              />
            </div>
            
            {/* Analysis Mode Toggle (only show if URL provided) */}
            {targetUrl && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Swarm Navigation Strategy
                </label>
                <div className="flex bg-black/30 rounded-lg p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setAnalysisMode("full")}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all duration-300 ${
                      analysisMode === "full"
                        ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Full Context Injection
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisMode("agentic")}
                    className={`flex-1 py-2 text-sm font-bold rounded-md transition-all duration-300 ${
                      analysisMode === "agentic"
                        ? "bg-indigo-500/20 text-indigo-400 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Agentic File Fetching
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1 pl-1">
                  {analysisMode === "full" 
                    ? "Best for small/medium repos. Embeds the entire codebase context upfront."
                    : "Best for massive monorepos. Agents dynamically fetch specific files they need."}
                </p>
              </motion.div>
            )}

            {/* Code snippet */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-indigo-400 transition-colors duration-300"
              >
                <HiOutlineCodeBracket className="w-5 h-5" />
                {showCode ? "Remove Code Snippet" : "Attach Raw Logs / Code Snippet"}
                <HiOutlineChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${showCode ? "rotate-180" : ""}`}
                />
              </button>
              {showCode && (
                <motion.textarea
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="Paste stack traces, terminal output, or relevant code blocks here..."
                  rows={6}
                  className="
                    w-full mt-4 px-5 py-4 rounded-xl
                    bg-black/50 border border-white/10
                    text-sm text-slate-300 font-medium font-mono placeholder-slate-600
                    focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20
                    resize-none transition-all duration-300
                  "
                />
              )}
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-8" />

          {/* Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm font-medium text-slate-400">
              Agent swarm will consume approximately <span className="text-emerald-400 font-bold">4.2k tokens</span> for initialization.
            </div>
            
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="
                w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl
                btn-primary text-lg font-bold text-white shadow-glow-indigo
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none
                transition-all duration-300
              "
            >
              {submitting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Initializing Swarm...
                </>
              ) : (
                <>
                  <HiOutlineBolt className="w-6 h-6" />
                  Deploy Agents
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm font-medium text-rose-400 animate-fade-in text-center">
              {error}
            </div>
          )}

        </form>
      </motion.div>
    </div>
  );
}
