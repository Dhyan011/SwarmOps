import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  HiArrowPath,
  HiOutlineBolt,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineFunnel,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
} from "react-icons/hi2";
import IncidentCard from "../components/IncidentCard";
import { getGitHubInstallations, getHealth, getIncidents } from "../services/api";
import { useIncident } from "../context/IncidentContext";

const statusOptions = [
  ["all", "All statuses"],
  ["investigating", "Investigating"],
  ["awaiting_review", "Awaiting review"],
  ["needs_review", "Needs review"],
  ["validation_failed", "Validation failed"],
  ["pr_created", "PR created"],
  ["rejected", "Rejected"],
  ["failed", "Failed"],
];

function Summary({ label, value, icon: Icon, tone = "text-slate-200" }) {
  return (
    <div className="border-l border-white/10 pl-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-400"><Icon className="h-4 w-4" />{label}</div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { incidents, setIncidents } = useIncident();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [integrationStatus, setIntegrationStatus] = useState({ loading: true, llmConfigured: null, githubLinked: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    let active = true;
    getIncidents()
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : data?.incidents || [];
        setIncidents(rows);
        setError("");
      })
      .catch((cause) => {
        if (active) setError(cause.response?.data?.detail || "Investigations could not be loaded. Check the connection and retry.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey, setIncidents]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getHealth(), getGitHubInstallations()]).then(([health, github]) => {
      if (!active) return;
      setIntegrationStatus({
        loading: false,
        llmConfigured: health.status === "fulfilled" ? Boolean(health.value.data?.llm_configured) : null,
        githubLinked: github.status === "fulfilled" ? Array.isArray(github.value.data) && github.value.data.length > 0 : null,
      });
    });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({
    active: incidents.filter((item) => item.status === "investigating").length,
    review: incidents.filter((item) => ["awaiting_review", "needs_review"].includes(item.status)).length,
    prs: incidents.filter((item) => item.status === "pr_created").length,
  }), [incidents]);

  const filteredIncidents = incidents.filter((incident) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch = !query || [incident.description, incident.incident_id, incident.service]
      .some((value) => String(value || "").toLowerCase().includes(query));
    return matchesSearch
      && (filterSeverity === "all" || incident.severity === filterSeverity)
      && (filterStatus === "all" || incident.status === filterStatus);
  });

  const retry = () => {
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Incident workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Investigations</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review active work, inspect what is known, and see what still needs attention.</p>
        </div>
        <Link to="/new-incident" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-300 px-4 font-semibold text-slate-950 hover:bg-blue-200">
          <HiOutlinePlus className="h-4 w-4" /> Investigate an incident
        </Link>
      </header>

      <section aria-label="Investigation summary" className="grid gap-5 border-b border-white/10 pb-6 sm:grid-cols-3">
        <Summary label="Active investigations" value={counts.active} icon={HiOutlineBolt} tone="text-blue-100" />
        <Summary label="Awaiting human review" value={counts.review} icon={HiOutlineClock} tone="text-amber-100" />
        <Summary label="Pull requests created" value={counts.prs} icon={HiOutlineCheckCircle} tone="text-slate-100" />
      </section>

      <section aria-label="Integration readiness" className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <div><p className="text-xs text-slate-400">Model provider</p><p className="mt-1 text-sm font-medium text-white">{integrationStatus.loading ? "Checking…" : integrationStatus.llmConfigured === null ? "Status unavailable" : integrationStatus.llmConfigured ? "Configured on backend" : "Configuration missing"}</p></div>
          <span className={`h-2 w-2 rounded-full ${integrationStatus.llmConfigured ? "bg-emerald-300" : "bg-amber-300"}`} aria-hidden="true" />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
          <div><p className="text-xs text-slate-400">GitHub App</p><p className="mt-1 text-sm font-medium text-white">{integrationStatus.loading ? "Checking…" : integrationStatus.githubLinked === null ? "Status unavailable" : integrationStatus.githubLinked ? "Installation linked" : "Not connected · optional"}</p></div>
          <Link to="/settings" className="text-xs font-medium text-blue-200 hover:text-white">Settings</Link>
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="recent-heading" className="text-lg font-semibold text-white">Recent investigations</h2>
            <p className="mt-1 text-xs text-slate-400">A created pull request is not the same as a resolved incident.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <span className="sr-only">Search investigations</span>
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search investigations" className="min-h-10 w-full rounded-md border border-white/15 bg-[#0f151f] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-200 focus:outline-none sm:w-56" />
            </label>
            <label className="relative block">
              <span className="sr-only">Filter by status</span>
              <HiOutlineFunnel className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="min-h-10 w-full appearance-none rounded-md border border-white/15 bg-[#0f151f] pl-9 pr-8 text-sm text-white focus:border-blue-200 focus:outline-none sm:w-48">
                {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="sr-only" htmlFor="severity-filter">Filter by severity</label>
            <select id="severity-filter" value={filterSeverity} onChange={(event) => setFilterSeverity(event.target.value)} className="min-h-10 rounded-md border border-white/15 bg-[#0f151f] px-3 text-sm text-white focus:border-blue-200 focus:outline-none">
              <option value="all">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-10 text-sm text-slate-300" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-blue-200" /> Loading investigations…</div>
        ) : error ? (
          <div className="mt-5 rounded-lg border border-rose-300/20 bg-rose-300/5 p-5" role="alert"><p className="text-sm text-rose-100">{error}</p><button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 text-sm text-white"><HiArrowPath className="h-4 w-4" /> Retry</button></div>
        ) : incidents.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-white/15 px-5 py-10 text-center">
            <p className="text-base font-medium text-white">No investigations yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">Start with a symptom and whatever logs or code context you have. Connecting GitHub is optional for manual-evidence investigations.</p>
            <Link to="/new-incident" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-300 px-4 font-semibold text-slate-950"><HiOutlinePlus className="h-4 w-4" /> Investigate an incident</Link>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="py-10 text-center"><p className="text-sm text-slate-300">No investigations match these filters.</p><button type="button" onClick={() => { setSearchTerm(""); setFilterSeverity("all"); setFilterStatus("all"); }} className="mt-2 text-sm text-blue-200 underline underline-offset-2">Clear filters</button></div>
        ) : (
          <ul className="divide-y divide-white/10" aria-label="Recent investigations">
            {filteredIncidents.map((incident) => <li key={incident.incident_id}><IncidentCard incident={incident} /></li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
