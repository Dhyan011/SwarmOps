import {
  HiOutlineBolt,
  HiOutlineClock,
  HiOutlineCheckBadge,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import MetricCard from "../components/MetricCard";
import { useIncident } from "../context/IncidentContext";

const agentPerformance = [
  { name: "Triage Agent", avgDuration: "0.8s", successRate: "99.2%" },
  { name: "Log Analysis", avgDuration: "2.1s", successRate: "97.8%" },
  { name: "Metrics Analysis", avgDuration: "1.9s", successRate: "98.5%" },
  { name: "Trace Analysis", avgDuration: "2.4s", successRate: "96.1%" },
  { name: "Security Scan", avgDuration: "3.2s", successRate: "99.0%" },
  { name: "Root Cause", avgDuration: "4.8s", successRate: "94.3%" },
  { name: "Fix Generation", avgDuration: "6.1s", successRate: "91.7%" },
  { name: "Validation", avgDuration: "2.6s", successRate: "98.9%" },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl shadow-2xl">
        <p className="text-white font-bold text-sm mb-1">{label}</p>
        <p className="text-indigo-400 font-bold text-lg">
          {payload[0].value}
          {payload[0].dataKey === "time" ? " min" : " incidents"}
        </p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { incidents } = useIncident();

  // Dynamic Metrics
  const total = incidents.length;
  const resolved = incidents.filter(i => i.status === "resolved" || i.status === "deployed").length;
  const successRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const avgRes = total > 0 ? Math.round(incidents.reduce((acc, inc) => acc + (inc.resolution_time_ms || 0), 0) / total / 1000 / 60 * 10) / 10 : 0;
  const escalations = incidents.filter(i => i.status === "rejected").length;

  // Dynamic Chart Data
  const severityData = [
    { name: "Low", count: incidents.filter(i => i.severity === "low").length, color: "#38bdf8" },
    { name: "Medium", count: incidents.filter(i => i.severity === "medium").length, color: "#fbbf24" },
    { name: "High", count: incidents.filter(i => i.severity === "high").length, color: "#f87171" },
    { name: "Critical", count: incidents.filter(i => i.severity === "critical").length, color: "#ef4444" },
  ];

  const resolutionData = incidents.length > 0 ? incidents.slice(-7).map((i, idx) => ({
    name: `Inc ${idx+1}`, time: i.resolution_time_ms ? Math.round(i.resolution_time_ms / 60000 * 10)/10 : 0
  })) : [{name: "No Data", time: 0}];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-white">
            Global Analytics
          </h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            SwarmOps Performance Insights
          </p>
        </div>
      </motion.div>

      {/* Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Incidents"
          value={total}
          suffix="incidents"
          icon={HiOutlineBolt}
          trend={total > 0 ? "up" : "none"}
          trendValue={total > 0 ? "+1 recent" : "No data"}
          delay={0}
        />
        <MetricCard
          label="Mean Resolution"
          value={avgRes}
          suffix="min"
          icon={HiOutlineClock}
          trend="none"
          trendValue="Based on history"
          delay={80}
        />
        <MetricCard
          label="Auto-Resolved"
          value={successRate}
          suffix="%"
          icon={HiOutlineCheckBadge}
          trend="none"
          trendValue="Overall rate"
          delay={160}
        />
        <MetricCard
          label="Escalations"
          value={escalations}
          icon={HiOutlineExclamationTriangle}
          trend="none"
          trendValue="Requires manual fix"
          delay={240}
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resolution Time Chart */}
        <div className="glass-card p-6 card-3d">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">
            Resolution Time Trend (min)
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#0d1117", stroke: "#818cf8", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#818cf8", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="glass-card p-6 card-3d">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">
            Incident Distribution
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Agent Performance Table */}
      <motion.div variants={itemVariants} className="glass-card overflow-hidden card-3d">
        <div className="px-6 py-5 border-b border-white/5 bg-black/20">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Agent Swarm Performance Matrix
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-black/10">
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Autonomous Agent
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Execution Time
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Reliability Score
                </th>
                <th className="text-left px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  System Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agentPerformance.map((agent, i) => (
                <tr
                  key={agent.name}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-white font-bold">
                    {agent.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300 font-mono font-medium">
                    {agent.avgDuration}
                  </td>
                  <td className="px-6 py-4 text-sm text-emerald-400 font-mono font-bold">
                    {agent.successRate}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Operational
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
