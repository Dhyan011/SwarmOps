import { useState } from "react";
import { useNavigate } from "react-router-dom";

function IncidentAnalysisPage() {
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [progress, setProgress] = useState([]);
  const [running, setRunning] = useState(false);

  const runAgents = (incidentData) => {
    setIncident(incidentData);
    setRunning(true);
    setProgress([]);

    setTimeout(() => {
      setProgress((prev) => [...prev, "LogAgent Completed"]);
    }, 1000);

    setTimeout(() => {
      setProgress((prev) => [...prev, "MetricAgent Completed"]);
    }, 2000);

    setTimeout(() => {
      setProgress((prev) => [...prev, "TraceAgent Completed"]);
    }, 3000);

    setTimeout(() => {
      setProgress((prev) => [...prev, "SecurityAgent Completed"]);
    }, 4000);

    setTimeout(() => {
      setProgress((prev) => [...prev, "Root Cause Identified"]);
      setRunning(false);
    }, 5000);
  };

  const memoryLeak = () => {
    runAgents({
      title: "Memory Leak",
      severity: "Critical",
      service: "UserService",
      rootCause:
        "Objects are not being released causing memory usage growth."
    });
  };

  const cpuSpike = () => {
    runAgents({
      title: "CPU Spike",
      severity: "High",
      service: "PaymentService",
      rootCause:
        "Infinite loop causing CPU utilization above 95%."
    });
  };

  const dbFailure = () => {
    runAgents({
      title: "Database Failure",
      severity: "Critical",
      service: "AuthService",
      rootCause:
        "Database connection pool exhausted."
    });
  };

  const approveFix = () => {
    navigate("/autofix");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">
        Incident Analysis
      </h1>

      <div className="bg-slate-900 p-6 rounded-xl mb-6">
        <h2 className="text-2xl font-semibold mb-4">
          Chaos Simulator
        </h2>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={memoryLeak}
            className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-lg"
          >
            Memory Leak
          </button>

          <button
            onClick={cpuSpike}
            className="bg-orange-600 hover:bg-orange-700 px-5 py-3 rounded-lg"
          >
            CPU Spike
          </button>

          <button
            onClick={dbFailure}
            className="bg-purple-600 hover:bg-purple-700 px-5 py-3 rounded-lg"
          >
            Database Failure
          </button>
        </div>
      </div>

      {running && (
        <div className="bg-slate-900 p-6 rounded-xl mb-6">
          <h2 className="text-xl font-bold mb-4">
            Agents Running...
          </h2>

          {progress.map((item, index) => (
            <div
              key={index}
              className="bg-green-800 p-3 rounded mb-2"
            >
              ✓ {item}
            </div>
          ))}
        </div>
      )}

      {incident && (
        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-4">
            Incident Report
          </h2>

          <p className="mb-2">
            <strong>Problem:</strong> {incident.title}
          </p>

          <p className="mb-2">
            <strong>Severity:</strong> {incident.severity}
          </p>

          <p className="mb-2">
            <strong>Service:</strong> {incident.service}
          </p>

          <p className="mb-4">
            <strong>Root Cause:</strong> {incident.rootCause}
          </p>

          <div className="bg-slate-800 p-4 rounded mb-4">
            <h3 className="font-bold mb-2">
              Recommended Action
            </h3>

            <p>
              Restart {incident.service} and apply generated fix.
            </p>
          </div>

          <button
            onClick={approveFix}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg"
          >
            Approve Fix
          </button>
        </div>
      )}
    </div>
  );
}

export default IncidentAnalysisPage;