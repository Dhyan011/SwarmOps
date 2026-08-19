import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineBolt,
  HiOutlineClock,
  HiOutlineCpuChip,
  HiOutlineCheckBadge,
  HiOutlineMagnifyingGlass,
  HiOutlineInboxStack,
  HiOutlineFunnel
} from "react-icons/hi2";
import { motion } from "framer-motion";
import MetricCard from "../components/MetricCard";
import IncidentCard from "../components/IncidentCard";
import EmptyState from "../components/EmptyState";
import { getIncidents } from "../services/api";
import { useIncident } from "../context/IncidentContext";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { incidents, setIncidents } = useIncident();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    getIncidents()
      .then((res) => {
        const data = res.data;
        setIncidents(Array.isArray(data) ? data : data?.incidents || []);
      })
      .catch(() => {});
  }, [setIncidents]);

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inc.incident_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inc.service?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || inc.severity === filterSeverity;
    const matchesStatus = filterStatus === "all" || inc.status === filterStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <motion.div 
      className="flex flex-col lg:flex-row gap-8 h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Left Column (40%) */}
      <div className="w-full lg:w-2/5 flex flex-col gap-6">
        
        {/* Provider Status */}
        <motion.div variants={itemVariants} className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400">🔷</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm">Gemini AI</p>
              <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Connected</p>
            </div>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-xl">🐙</span>
            <div>
              <p className="text-white font-bold text-sm">@dhyanpatel</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">GitHub</p>
            </div>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
          <MetricCard
            label="Total Incidents"
            value={incidents.length}
            icon={HiOutlineBolt}
            trend={incidents.length > 0 ? "up" : "none"}
            trendValue={incidents.length > 0 ? "+1 recent" : "No data yet"}
            delay={0}
          />
          <MetricCard
            label="Resolved Rate"
            value={incidents.length ? Math.round(incidents.filter(i => i.status === "resolved" || i.status === "deployed").length / incidents.length * 100) : 100}
            suffix="%"
            icon={HiOutlineCheckBadge}
            trend="none"
            trendValue="Overall resolution rate"
            delay={80}
          />
          <MetricCard
            label="Avg Confidence"
            value="94"
            suffix="%"
            icon={HiOutlineCpuChip}
            trend="up"
            trendValue="High accuracy"
            delay={160}
          />
          <MetricCard
            label="Active Now"
            value={incidents.filter(i => i.status === "investigating").length}
            icon={HiOutlineClock}
            trend="none"
            trendValue="Running swarms"
            delay={240}
          />
        </motion.div>

        {/* Action Button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={() => navigate("/new-incident")}
            className="w-full btn-primary py-4 rounded-xl text-lg flex items-center justify-center gap-2 shadow-glow-indigo transition-transform card-3d"
          >
            <HiOutlineBolt className="w-6 h-6" />
            Launch New Investigation
          </button>
        </motion.div>
      </div>

      {/* Right Column (60%) */}
      <div className="w-full lg:w-3/5 flex flex-col gap-4 h-[calc(100vh-8rem)]">
        
        {/* Search & Filter Bar */}
        <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="relative flex-1 w-full">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search incidents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <HiOutlineFunnel className="text-slate-400 w-5 h-5 hidden sm:block" />
            <select 
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none flex-1 sm:flex-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none flex-1 sm:flex-none"
            >
              <option value="all">All Statuses</option>
              <option value="investigating">Running</option>
              <option value="resolved">Deployed</option>
              <option value="failed">Rejected</option>
            </select>
          </div>
        </motion.div>

        {/* Incident Stream */}
        <motion.div variants={itemVariants} className="flex-1 overflow-y-auto pr-2 pb-10 space-y-3 no-scrollbar">
          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((inc, i) => (
              <IncidentCard key={inc.incident_id || i} incident={inc} delay={i * 60} />
            ))
          ) : (
            <div className="mt-8">
              <EmptyState
                title="No incidents found"
                description={searchTerm || filterSeverity !== "all" || filterStatus !== "all" ? "Adjust your search or filters to see results." : "The command center is quiet. Launch an investigation to begin."}
                icon={HiOutlineInboxStack}
              />
            </div>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
}
