import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function InvestigationPage() {
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);

  const agents = [
    {
      name: "Log Agent",
      status: "Completed",
      output: "Detected repeated 500 errors from API Gateway"
    },
    {
      name: "Metric Agent",
      status: "Completed",
      output: "CPU usage reached 95%"
    },
    {
      name: "Trace Agent",
      status: "Running",
      output: "Analyzing distributed traces..."
    },
    {
      name: "Config Agent",
      status: "Waiting",
      output: "-"
    },
    {
      name: "Security Agent",
      status: "Waiting",
      output: "-"
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          Live Investigation
        </h1>

        <p className="text-gray-400 mb-8">
          SwarmOps Autonomous Incident Response
        </p>

        <div className="bg-slate-900 rounded-xl p-6 mb-8 border border-slate-800">

          <h2 className="text-2xl font-semibold mb-4">
            Incident Details
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            <div>
              <p className="text-gray-400">Incident ID</p>
              <p>INC-2026-001</p>
            </div>

            <div>
              <p className="text-gray-400">Severity</p>
              <p className="text-red-500">Critical</p>
            </div>

            <div>
              <p className="text-gray-400">Service</p>
              <p>Payment Gateway</p>
            </div>

            <div>
              <p className="text-gray-400">Status</p>
              <p className="text-yellow-400">
                Investigation Running
              </p>
            </div>

          </div>

        </div>

        <div className="bg-slate-900 rounded-xl p-6 mb-8 border border-slate-800">

          <div className="flex justify-between mb-3">

            <h2 className="text-xl font-semibold">
              Investigation Progress
            </h2>

            <span>{progress}%</span>

          </div>

          <div className="w-full bg-slate-700 rounded-full h-4">

            <div
              className="bg-green-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />

          </div>

        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">

            <h2 className="text-xl font-semibold mb-5">
              Active Agents
            </h2>

            {agents.map((agent, index) => (
              <div
                key={index}
                className="mb-4 p-4 rounded-lg bg-slate-800"
              >
                <div className="flex justify-between">

                  <h3 className="font-semibold">
                    {agent.name}
                  </h3>

                  <span
                    className={`text-sm ${
                      agent.status === "Completed"
                        ? "text-green-400"
                        : agent.status === "Running"
                        ? "text-yellow-400"
                        : "text-gray-400"
                    }`}
                  >
                    {agent.status}
                  </span>

                </div>

                <p className="text-gray-300 mt-2">
                  {agent.output}
                </p>

              </div>
            ))}

          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">

            <h2 className="text-xl font-semibold mb-5">
              Investigation Logs
            </h2>

            <div className="space-y-3 text-sm">

              <div className="bg-slate-800 p-3 rounded">
                12:00 PM → Alert received
              </div>

              <div className="bg-slate-800 p-3 rounded">
                12:01 PM → Log Agent started analysis
              </div>

              <div className="bg-slate-800 p-3 rounded">
                12:02 PM → Metric Agent detected CPU spike
              </div>

              <div className="bg-slate-800 p-3 rounded">
                12:03 PM → Trace Agent analyzing requests
              </div>

            </div>

          </div>

        </div>

        <div className="mt-10 flex justify-end">

          <button
            onClick={() => navigate("/resolution")}
            className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold"
          >
            View Resolution →
          </button>

        </div>

      </div>

    </div>
  );
}