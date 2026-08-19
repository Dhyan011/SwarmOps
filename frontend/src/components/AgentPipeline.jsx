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
    icon: "text-slate-400",
  },
  running: {
    ring: "border-cyan-500/50",
    bg: "bg-cyan-500/10",
    icon: "text-cyan-400",
  },
  completed: {
    ring: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    icon: "text-emerald-400",
  },
  failed: {
    ring: "border-rose-500/40",
    bg: "bg-rose-500/10",
    icon: "text-rose-400",
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
    <div className="glass-card-static p-6 animate-fade-in w-full overflow-hidden">
      {/* Phase Labels */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto no-scrollbar relative z-10">
        {PHASES.map((phase, pi) => (
          <div key={phase.label} className="flex items-center">
            {pi > 0 && <div className="w-px h-4 bg-white/10 mx-3" />}
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">
              {phase.label}
            </span>
          </div>
        ))}
      </div>

      {/* 3D Pipeline Stage */}
      <div className="stage-3d w-full overflow-visible py-4">
        <div className="flex items-center gap-0 w-max pipeline-3d-track" style={{ transform: "rotateX(6deg)" }}>
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
                  <div className="w-8 lg:w-12 flex items-center h-[2px]">
                    <div
                      className={`
                        h-full w-full rounded-full
                        ${lineActive ? "pipeline-line-active" : "bg-white/10"}
                      `}
                    />
                  </div>
                )}

                {/* Agent Node */}
                <div className="flex flex-col items-center gap-2 relative group">
                  <div
                    className={`
                      w-12 h-12 rounded-xl border-2 flex items-center justify-center
                      agent-node ${status === "running" ? "agent-node-running" : ""}
                      ${style.ring} ${style.bg}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${style.icon} transition-colors duration-300`} />
                  </div>
                  <span
                    className={`
                      text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-colors duration-300 mt-1
                      ${status === "idle" ? "text-slate-400" : ""}
                      ${status === "running" ? "text-cyan-400" : ""}
                      ${status === "completed" ? "text-emerald-400" : ""}
                      ${status === "failed" ? "text-rose-400" : ""}
                    `}
                  >
                    {formatAgentName(agentName)}
                  </span>

                  {/* Completed checkmark */}
                  {status === "completed" && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg transform translate-z-[4px]">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}

                  {/* Failed X */}
                  {status === "failed" && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shadow-lg transform translate-z-[4px]">
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
    </div>
  );
}
