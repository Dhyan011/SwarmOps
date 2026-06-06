import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const performanceData = [
  { time: "12:00", latency: 8500 },
  { time: "12:05", latency: 7000 },
  { time: "12:10", latency: 5000 },
  { time: "12:15", latency: 2200 },
  { time: "12:20", latency: 500 },
  { time: "12:25", latency: 180 }
];

export default function AnalyticsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl font-bold mb-2">
          Incident Analytics
        </h1>

        <p className="text-gray-400 mb-8">
          Post Incident Learning & Monitoring
        </p>

        <div className="grid md:grid-cols-4 gap-6 mb-8">

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">
              Incidents Resolved
            </h3>

            <p className="text-3xl font-bold mt-2">
              27
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">
              AI Accuracy
            </h3>

            <p className="text-3xl font-bold text-green-400 mt-2">
              96%
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">
              Downtime Saved
            </h3>

            <p className="text-3xl font-bold text-blue-400 mt-2">
              42 hrs
            </p>
          </div>

          <div className="bg-slate-900 p-6 rounded-xl">
            <h3 className="text-gray-400">
              Cost Saved
            </h3>

            <p className="text-3xl font-bold text-yellow-400 mt-2">
              $120K
            </p>
          </div>

        </div>

        <div className="bg-slate-900 rounded-xl p-6 mb-8">

          <h2 className="text-2xl font-semibold mb-6">
            Latency Recovery
          </h2>

          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={performanceData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="time" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="latency"
                stroke="#22c55e"
                strokeWidth={3}
              />

            </LineChart>
          </ResponsiveContainer>

        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">

          <div className="bg-slate-900 p-6 rounded-xl">

            <h2 className="text-2xl font-semibold mb-4">
              AI Learnings
            </h2>

            <div className="space-y-4">

              <div className="bg-slate-800 p-4 rounded">
                Memory leaks detected in 78% of payment failures.
              </div>

              <div className="bg-slate-800 p-4 rounded">
                CPU spikes usually occur 5 minutes before outage.
              </div>

              <div className="bg-slate-800 p-4 rounded">
                Kubernetes resource limits need tuning.
              </div>

            </div>

          </div>

          <div className="bg-slate-900 p-6 rounded-xl">

            <h2 className="text-2xl font-semibold mb-4">
              Recent Incidents
            </h2>

            <div className="space-y-4">

              <div className="bg-slate-800 p-4 rounded">
                INC-001 → Payment Gateway Failure
              </div>

              <div className="bg-slate-800 p-4 rounded">
                INC-002 → Database Timeout
              </div>

              <div className="bg-slate-800 p-4 rounded">
                INC-003 → API Gateway Crash
              </div>

            </div>

          </div>

        </div>

        <div className="flex justify-center pt-8 border-t border-slate-800">
          <button
            onClick={() => navigate("/report")}
            className="bg-cyan-600 hover:bg-cyan-700 px-10 py-4 rounded-xl font-bold text-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
          >
            Generate Final Report →
          </button>
        </div>

      </div>

    </div>
  );
}