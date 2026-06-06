import { useNavigate } from "react-router-dom";

export default function ResolutionPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          Root Cause Analysis
        </h1>

        <p className="text-gray-400 mb-8">
          AI Generated Incident Resolution Report
        </p>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">Incident</h3>
            <p className="text-xl font-semibold mt-2">
              Payment Service Failure
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">Severity</h3>
            <p className="text-red-500 text-xl font-semibold mt-2">
              Critical
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">Confidence</h3>
            <p className="text-green-500 text-xl font-semibold mt-2">
              97%
            </p>
          </div>

        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">

          <h2 className="text-2xl font-semibold mb-4">
            Root Cause
          </h2>

          <div className="bg-red-500/10 border border-red-500 rounded-lg p-5">

            <p className="text-lg leading-8">
              A memory leak inside the Payment Gateway service caused
              container memory consumption to continuously increase.
              Kubernetes eventually terminated the pod due to OOM
              (Out Of Memory) events, resulting in repeated 500 errors
              and service downtime.
            </p>

          </div>

        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">

          <h2 className="text-2xl font-semibold mb-4">
            Impact Analysis
          </h2>

          <ul className="space-y-3">

            <li className="bg-slate-800 p-4 rounded">
              Payment API unavailable for 23 minutes
            </li>

            <li className="bg-slate-800 p-4 rounded">
              14,000 failed customer requests
            </li>

            <li className="bg-slate-800 p-4 rounded">
              Estimated revenue impact: $28,000
            </li>

            <li className="bg-slate-800 p-4 rounded">
              Service availability dropped to 72%
            </li>

          </ul>

        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">

          <h2 className="text-2xl font-semibold mb-4">
            Evidence Collected
          </h2>

          <div className="space-y-4">

            <div className="bg-slate-800 p-4 rounded">
              <h3 className="font-semibold text-green-400">
                Log Agent
              </h3>

              <p className="mt-2">
                Repeated "OutOfMemoryError" detected in application logs.
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded">
              <h3 className="font-semibold text-green-400">
                Metric Agent
              </h3>

              <p className="mt-2">
                Memory utilization reached 98% before crash.
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded">
              <h3 className="font-semibold text-green-400">
                Trace Agent
              </h3>

              <p className="mt-2">
                Transaction latency increased from 200ms to 8s.
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded">
              <h3 className="font-semibold text-green-400">
                Config Agent
              </h3>

              <p className="mt-2">
                Pod memory limit configured too low.
              </p>
            </div>

          </div>

        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 mb-8">

          <h2 className="text-2xl font-semibold mb-4">
            Recommended Fixes
          </h2>

          <div className="space-y-4">

            <div className="bg-slate-800 p-4 rounded">
              Increase Kubernetes memory limit.
            </div>

            <div className="bg-slate-800 p-4 rounded">
              Fix object cleanup process causing memory leak.
            </div>

            <div className="bg-slate-800 p-4 rounded">
              Restart affected containers.
            </div>

            <div className="bg-slate-800 p-4 rounded">
              Add memory monitoring alerts.
            </div>

          </div>

        </div>

        <div className="flex justify-end">

          <button
            onClick={() => navigate("/autofix")}
            className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold"
          >
            Generate Auto Fix →
          </button>

        </div>

      </div>

    </div>
  );
}