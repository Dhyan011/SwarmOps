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

import { useIncident } from "../context/IncidentContext";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card-static px-3 py-2 text-xl">
        <p className="text-black font-bold mb-1">{label}</p>
        <p className="text-blue-400 font-semibold">
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
    { name: "Low", count: incidents.filter(i => i.severity === "low").length, color: "#22d3ee" },
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
      className="space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          <span className="gradient-text">Analytics</span>
        </h1>
        <p className="text-xl text-black font-bold">
          Performance insights and historical incident data.
        </p>
      </motion.div>

      {/* Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          label="Escalations (Rejected)"
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
        <div className="glass-card-static p-6">
          <h3 className="text-xl font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium mb-6">
            Resolution Time (min)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={resolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#000000", fontWeight: "bold", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#000000", fontWeight: "bold", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#0c1220", stroke: "#22d3ee", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#22d3ee" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="glass-card-static p-6">
          <h3 className="text-xl font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium mb-6">
            Incidents by Severity
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#000000", fontWeight: "bold", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#000000", fontWeight: "bold", fontSize: 11 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
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
      <motion.div variants={itemVariants} className="glass-card-static overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.1]">
          <h3 className="text-xl font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium">
            Agent Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium">
                  Agent
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium">
                  Avg Duration
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium">
                  Success Rate
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-black font-bold font-semibold font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map((agent, i) => (
                <tr
                  key={agent.name}
                  className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <td className="px-6 py-3.5 text-xl text-black font-extrabold font-medium">
                    {agent.name}
                  </td>
                  <td className="px-6 py-3.5 text-xl text-black font-bold tabular-nums font-mono">
                    {agent.avgDuration}
                  </td>
                  <td className="px-6 py-3.5 text-xl text-black font-bold tabular-nums font-mono">
                    {agent.successRate}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      Healthy
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
