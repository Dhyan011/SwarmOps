import {
  HiOutlineFunnel,
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineChartBarSquare,
  HiOutlineSignal,
  HiOutlineShieldCheck,
  HiOutlineLightBulb,
  HiOutlineWrenchScrewdriver,
  HiOutlineCheckBadge,
} from "react-icons/hi2";

const AGENT_ICONS = {
  triage: HiOutlineFunnel,
  log_analysis: HiOutlineDocumentMagnifyingGlass,
  metrics_analysis: HiOutlineChartBarSquare,
  trace_analysis: HiOutlineSignal,
  security_scan: HiOutlineShieldCheck,
  root_cause: HiOutlineLightBulb,
  fix_generation: HiOutlineWrenchScrewdriver,
  validation: HiOutlineCheckBadge,
};

const PHASES = [
  { label: "Triage", agents: ["triage"] },
  { label: "Analysis", agents: ["log_analysis", "metrics_analysis", "trace_analysis", "security_scan"] },
  { label: "Diagnosis", agents: ["root_cause"] },
  { label: "Remediation", agents: ["fix_generation"] },
  { label: "Validation", agents: ["validation"] },
];

const statusStyles = {
  idle: {
    ring: "border-white/10",
    bg: "bg-white/[0.03]",
    icon: "text-slate-600",
    dot: "",
  },
  running: {
    ring: "border-blue-500/50",
    bg: "bg-blue-500/10",
    icon: "text-blue-400",
    dot: "animate-pulse-dot",
  },
  completed: {
    ring: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-400",
    dot: "",
  },
  failed: {
    ring: "border-red-500/40",
    bg: "bg-red-500/10",
    icon: "text-red-400",
    dot: "",
  },
};

function formatAgentName(name) {
  return name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AgentPipeline({ agents = [] }) {
  // Build agent status lookup
  const agentStatusMap = {};
  agents.forEach((a) => {
    agentStatusMap[a.name] = a.status || "idle";
  });

  // Flatten all agents in order
  const allAgents = PHASES.flatMap((p) => p.agents);

  return (
    <div className="glass-card-static p-6 animate-fade-in">
      {/* Phase Labels */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar">
        {PHASES.map((phase, pi) => (
          <div key={phase.label} className="flex items-center">
            {pi > 0 && <div className="w-px h-4 bg-slate-900/40 mx-3" />}
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600 font-medium whitespace-nowrap">
              {phase.label}
            </span>
          </div>
        ))}
      </div>

      {/* Pipeline Nodes */}
      <div className="flex items-center gap-0 overflow-x-auto no-scrollbar pb-2">
        {allAgents.map((agentName, i) => {
          const status = agentStatusMap[agentName] || "idle";
          const style = statusStyles[status];
          const Icon = AGENT_ICONS[agentName] || HiOutlineFunnel;
          const prevStatus = i > 0 ? (agentStatusMap[allAgents[i - 1]] || "idle") : null;
          const lineActive = prevStatus === "completed" || prevStatus === "running";

          return (
            <div key={agentName} className="flex items-center shrink-0">
              {/* Connector Line */}
              {i > 0 && (
                <div className="w-8 lg:w-12 flex items-center">
                  <div
                    className={`
                      h-[2px] w-full rounded-full transition-all duration-500
                      ${lineActive ? "bg-gradient-to-r from-blue-500 to-blue-400" : "bg-slate-900/40"}
                    `}
                  />
                </div>
              )}

              {/* Agent Node */}
              <div className="flex flex-col items-center gap-2 relative group">
                <div
                  className={`
                    w-11 h-11 rounded-xl border-2 flex items-center justify-center
                    transition-all duration-300
                    ${style.ring} ${style.bg}
                    ${status === "running" ? "animate-glow shadow-blue-500/20" : ""}
                  `}
                >
                  <Icon className={`w-5 h-5 ${style.icon} transition-colors duration-300`} />
                </div>
                <span
                  className={`
                    text-[10px] font-medium whitespace-nowrap transition-colors duration-300
                    ${status === "idle" ? "text-slate-600" : ""}
                    ${status === "running" ? "text-blue-400" : ""}
                    ${status === "completed" ? "text-emerald-400" : ""}
                    ${status === "failed" ? "text-red-400" : ""}
                  `}
                >
                  {formatAgentName(agentName)}
                </span>

                {/* Running pulse dot */}
                {status === "running" && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse-dot" />
                )}

                {/* Completed checkmark */}
                {status === "completed" && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}

                {/* Failed X */}
                {status === "failed" && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3L9 9M9 3L3 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
