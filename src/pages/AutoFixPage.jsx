import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AutoFixPage() {
  const [deployed, setDeployed] = useState(false);
  const navigate = useNavigate();

  const oldCode = `
const cache = [];

function processPayment(req) {
   cache.push(req.body);
   return executePayment(req.body);
}
`;

  const fixedCode = `
const cache = [];

function processPayment(req) {

   if(cache.length > 1000){
      cache.shift();
   }

   cache.push(req.body);

   return executePayment(req.body);
}
`;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          AI Auto Fix Engine
        </h1>

        <p className="text-gray-400 mb-8">
          Generated Fix Based On Root Cause Analysis
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">
              Root Cause
            </h3>

            <p className="text-red-400 text-xl font-semibold mt-2">
              Memory Leak
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">
              Confidence
            </h3>

            <p className="text-green-400 text-xl font-semibold mt-2">
              97%
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">
              Files Modified
            </h3>

            <p className="text-xl font-semibold mt-2">
              3 Files
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <h3 className="text-gray-400">
              Risk Score
            </h3>

            <p className="text-yellow-400 text-xl font-semibold mt-2">
              Low
            </p>
          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-8">

          <h2 className="text-2xl font-semibold mb-5">
            AI Generated Fix Summary
          </h2>

          <div className="space-y-4">

            <div className="bg-slate-800 p-4 rounded-lg">
              Added cache cleanup mechanism.
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              Reduced memory growth inside service.
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              Prevented unlimited object accumulation.
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              Eliminated Out Of Memory crashes.
            </div>

          </div>

        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">

            <h2 className="text-xl font-semibold text-red-400 mb-4">
              Original Code
            </h2>

            <pre className="bg-black rounded-lg p-4 overflow-auto text-sm">
              <code>{oldCode}</code>
            </pre>

          </div>

          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">

            <h2 className="text-xl font-semibold text-green-400 mb-4">
              Fixed Code
            </h2>

            <pre className="bg-black rounded-lg p-4 overflow-auto text-sm">
              <code>{fixedCode}</code>
            </pre>

          </div>

        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 mb-8">

          <h2 className="text-2xl font-semibold mb-5">
            Deployment Plan
          </h2>

          <div className="space-y-4">

            <div className="bg-slate-800 p-4 rounded-lg">
              ✅ Build Updated Container
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              ✅ Execute Automated Tests
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              ✅ Deploy To Kubernetes Cluster
            </div>

            <div className="bg-slate-800 p-4 rounded-lg">
              ✅ Verify Service Health
            </div>

          </div>

        </div>

        {!deployed ? (
          <div className="flex flex-wrap gap-4 justify-end">

            <button
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg"
            >
              Download Patch
            </button>

            <button
              className="bg-gray-700 hover:bg-gray-800 px-6 py-3 rounded-lg"
            >
              Rollback Plan
            </button>

            <button
              onClick={() => setDeployed(true)}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-semibold"
            >
              Deploy Fix
            </button>

          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500 rounded-xl p-8 text-center">

            <h2 className="text-4xl font-bold text-green-400 mb-4">
              Deployment Successful
            </h2>

            <p className="text-lg text-gray-300 mb-8">
              AI successfully applied the fix and restored the service.
            </p>

            <div className="grid md:grid-cols-3 gap-4 mb-8">

              <div className="bg-slate-900 p-5 rounded-lg">
                <h3 className="text-gray-400">
                  Service Uptime
                </h3>

                <p className="text-2xl font-bold text-green-400 mt-2">
                  100%
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-lg">
                <h3 className="text-gray-400">
                  Error Rate
                </h3>

                <p className="text-2xl font-bold text-green-400 mt-2">
                  0%
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-lg">
                <h3 className="text-gray-400">
                  Response Time
                </h3>

                <p className="text-2xl font-bold text-green-400 mt-2">
                  180ms
                </p>
              </div>

            </div>

            <button
              onClick={() => navigate("/analytics")}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold"
            >
              View Analytics →
            </button>

          </div>
        )}

      </div>
    </div>
  );
}