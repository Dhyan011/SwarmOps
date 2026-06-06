import { Link } from "react-router-dom";

function IncidentReportPage() {
  const report = {
    incident: "Memory Leak Detected",
    severity: "High",
    rootCause:
      "Database connections were not properly closed after requests.",
    affectedService: "Authentication API",
    detectedBy: "Detection Agent",
    fixedBy: "Fix Agent",
    validation: "Passed",
    resolutionTime: "4 minutes",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">

        <h1 className="text-4xl font-bold mb-6">
          Final Incident Report
        </h1>

        <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">

          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <h3 className="text-slate-400">
                Incident
              </h3>
              <p className="text-xl">
                {report.incident}
              </p>
            </div>

            <div>
              <h3 className="text-slate-400">
                Severity
              </h3>
              <p className="text-red-400 text-xl">
                {report.severity}
              </p>
            </div>

            <div>
              <h3 className="text-slate-400">
                Affected Service
              </h3>
              <p>
                {report.affectedService}
              </p>
            </div>

            <div>
              <h3 className="text-slate-400">
                Resolution Time
              </h3>
              <p>
                {report.resolutionTime}
              </p>
            </div>

          </div>

          <div className="mt-8">
            <h3 className="text-slate-400 mb-2">
              Root Cause Analysis
            </h3>

            <div className="bg-slate-800 p-4 rounded-lg">
              {report.rootCause}
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-slate-400 mb-2">
              Agent Summary
            </h3>

            <div className="space-y-3">

              <div className="bg-slate-800 p-3 rounded">
                Detection Agent → Incident Found
              </div>

              <div className="bg-slate-800 p-3 rounded">
                Root Cause Agent → Cause Identified
              </div>

              <div className="bg-slate-800 p-3 rounded">
                Security Agent → Security Scan Completed
              </div>

              <div className="bg-slate-800 p-3 rounded">
                Evidence Agent → Logs Collected
              </div>

              <div className="bg-slate-800 p-3 rounded">
                Fix Agent → Patch Generated
              </div>

              <div className="bg-slate-800 p-3 rounded">
                Validation Agent → {report.validation}
              </div>

            </div>
          </div>

          <div className="flex gap-4 mt-8">

            <button className="bg-blue-600 px-6 py-3 rounded-lg hover:bg-blue-700">
              Download PDF
            </button>

            <button className="bg-green-600 px-6 py-3 rounded-lg hover:bg-green-700">
              Export JSON
            </button>

            <button className="bg-purple-600 px-6 py-3 rounded-lg hover:bg-purple-700">
              Share Report
            </button>

          </div>

        </div>

        <div className="mt-8 flex justify-between">

          <Link
            to="/analytics"
            className="bg-slate-700 px-6 py-3 rounded-lg"
          >
            Back
          </Link>

          <Link
            to="/"
            className="bg-green-600 px-6 py-3 rounded-lg"
          >
            New Incident
          </Link>

        </div>

      </div>
    </div>
  );
}

export default IncidentReportPage;