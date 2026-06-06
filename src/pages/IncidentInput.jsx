import { useState } from "react";
import { useNavigate } from "react-router-dom";

function IncidentInput() {
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [severity, setSeverity] = useState("Medium");

  const handleAnalyze = () => {
    navigate("/dashboard", {
      state: {
        code,
        language,
        severity,
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex justify-center items-center">
      <div className="w-full max-w-4xl bg-slate-900 rounded-xl p-8 shadow-lg">

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-cyan-400 mb-4">
            SwarmOps
          </h1>

          <p className="text-slate-300 text-lg">
            Autonomous Incident Response Platform
          </p>

          <p className="text-slate-400 mt-2">
            Upload your code or paste it below to begin AI-powered
            incident investigation.
          </p>
        </div>

        <div className="space-y-6">

          <div>
            <label className="block mb-2 font-semibold">
              Programming Language
            </label>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-slate-800 p-3 rounded-lg"
            >
              <option>javascript</option>
              <option>python</option>
              <option>java</option>
              <option>cpp</option>
              <option>typescript</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Incident Severity
            </label>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-slate-800 p-3 rounded-lg"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Upload Source Code
            </label>

            <input
              type="file"
              className="w-full bg-slate-800 p-3 rounded-lg"
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">
              Paste Source Code
            </label>

            <textarea
              rows="15"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste your application code here..."
              className="w-full bg-slate-800 p-4 rounded-lg font-mono text-sm"
            />
          </div>

          <button
            onClick={handleAnalyze}
            className="w-full bg-cyan-500 hover:bg-cyan-600 py-4 rounded-lg text-lg font-bold"
          >
            Start AI Investigation
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncidentInput;