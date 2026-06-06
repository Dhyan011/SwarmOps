import { useLocation, useNavigate } from "react-router-dom";

import AgentStatus from "../AgentStatus";
import AgentGraph from "../AgentGraph";
import TimelinePanel from "../TimelinePanel";
import EvidencePanel from "../EvidencePanel";
import ApproveFix from "../ApproveFix";

function Dashboard() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const code = state?.code || "";

  const handleNext = () => {
    navigate("/report", {
      state: {
        code,
      },
    });
  };

  const goToAnalysis = () => {
    navigate("/analysis");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-5">
        <h1 className="text-3xl font-bold text-cyan-400">
          SwarmOps Investigation Center
        </h1>

        <p className="text-slate-400 mt-2">
          Autonomous Multi-Agent Incident Response
        </p>
      </div>

      <div className="p-6 space-y-6">

        <div className="bg-slate-900 rounded-xl p-5">
          <h2 className="text-xl font-bold mb-3">
            Incident Summary
          </h2>

          <div className="grid md:grid-cols-3 gap-4">

            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-slate-400">
                Status
              </p>

              <p className="text-red-400 font-bold">
                Incident Detected
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-slate-400">
                Priority
              </p>

              <p className="text-yellow-400 font-bold">
                High
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              <p className="text-slate-400">
                Agents Active
              </p>

              <p className="text-green-400 font-bold">
                6 / 6
              </p>
            </div>

          </div>
        </div>

        <AgentStatus />

        <AgentGraph />

        <div className="grid md:grid-cols-2 gap-6">
          <TimelinePanel />
          <EvidencePanel />
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-indigo-500/30">
          <h2 className="text-xl font-bold mb-2">
            Incident Analysis
          </h2>
          <p className="text-slate-400 mb-4">
            Run automated agents to analyze logs, metrics, and traces to identify root causes.
          </p>
          <button
            onClick={goToAnalysis}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-bold transition-colors"
          >
            Open Analysis Center →
          </button>
        </div>

        <ApproveFix />

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            className="bg-cyan-500 hover:bg-cyan-600 px-8 py-3 rounded-lg font-bold"
          >
            Generate Final Report →
          </button>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;