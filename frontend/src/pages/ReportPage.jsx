import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HiArrowDownTray, HiArrowLeft, HiOutlineShieldCheck } from "react-icons/hi2";
import CodeDiff from "../components/CodeDiff";
import StatusBadge from "../components/StatusBadge";
import { getIncident } from "../services/api";

const stateVariant = (status) => status === "pr_created" ? "pr"
  : ["awaiting_review", "needs_review"].includes(status) ? "review"
    : ["failed", "rejected", "validation_failed"].includes(status) ? "failure" : "neutral";

function jsonDownload(data, id) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `swarmops-report-${String(id || "incident").slice(0, 12)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ id: null, report: null, loading: true, error: "" });
  const report = state.id === id ? state.report : null;
  const loading = state.id !== id || state.loading;

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    getIncident(id)
      .then(({ data }) => { if (active) setState({ id, report: data, loading: false, error: "" }); })
      .catch((cause) => { if (active) setState({ id, report: null, loading: false, error: cause.response?.status === 404 ? "This report was not found in your account." : "The report could not be loaded." }); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div role="status" className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-300"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-blue-200" /> Loading report…</div>;
  if (!report) return <main className="mx-auto max-w-xl py-20 text-center"><h1 className="text-2xl font-semibold text-white">Report unavailable</h1><p className="mt-3 text-sm text-slate-300">{state.id === id ? state.error : "The report could not be loaded."}</p><Link to="/dashboard" className="mt-5 inline-flex min-h-10 items-center rounded-md bg-blue-300 px-4 font-semibold text-slate-950">Back to investigations</Link></main>;

  return (
    <main className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={() => navigate(`/incident/${encodeURIComponent(id)}`)} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><HiArrowLeft className="h-4 w-4" /> Back to investigation</button>
          <p className="text-sm font-medium text-blue-200">Saved investigation report</p>
          <h1 className="mt-2 font-mono text-2xl font-semibold text-white">#{report.incident_id?.slice(0, 12) || id}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{report.description}</p>
        </div>
        <button type="button" onClick={() => jsonDownload(report, id)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5"><HiArrowDownTray className="h-4 w-4" /> Export JSON</button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-[#0f151f] p-5">
          <h2 className="text-sm font-semibold text-white">Status and provenance</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2"><StatusBadge variant={stateVariant(report.status)}>{(report.status || "unknown").replaceAll("_", " ")}</StatusBadge><span className="text-xs text-slate-400">Severity: {report.severity || "unknown"}</span></div>
          <p className="mt-4 text-xs leading-5 text-slate-400">Created: {report.created_at ? new Date(report.created_at).toLocaleString() : "Not recorded"}</p>
          <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">User-supplied evidence</p>{report.user_supplied_evidence ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#090d14] p-3 font-mono text-xs leading-5 text-slate-300">{report.user_supplied_evidence}</pre> : <p className="mt-2 text-sm text-slate-400">No evidence text retained.</p>}</div>
          <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Repository context</p>{report.target_url ? <a href={report.target_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm text-blue-200 underline underline-offset-2">{report.target_url}</a> : <p className="mt-2 text-sm text-slate-400">Not provided</p>}<p className="mt-1 text-xs text-slate-500">Public context is not write authorization.</p></div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0f151f] p-5">
          <h2 className="text-sm font-semibold text-white">AI-generated hypothesis</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{report.root_cause || "No hypothesis recorded."}</p>
          <p className="mt-3 text-xs text-slate-400">Model-estimated confidence: {Number.isFinite(report.confidence) ? `${report.confidence}%` : "not recorded"}; this is not a calibrated probability.</p>
          <div className="mt-4 border-t border-white/10 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Recommended fix</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{report.recommended_fix || "No fix description recorded."}</p></div>
          <div className="mt-4 border-t border-white/10 pt-4"><h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400"><HiOutlineShieldCheck className="h-4 w-4" /> Validation and policy</h3><p className="mt-2 text-sm text-slate-200">Validation: {(report.validation_state || "needs_manual_review").replaceAll("_", " ")} · Policy: {report.policy_state || "not checked"}</p><p className="mt-2 text-sm text-amber-100">Tests executed: {report.tests_executed ? "reported as executed" : "No — AI-generated tests were not run"}</p>{Array.isArray(report.policy_findings) && report.policy_findings.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-100">{report.policy_findings.map((finding, index) => <li key={`${index}-${finding}`}>{finding}</li>)}</ul>}</div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f151f] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-white">Proposed patch</h2><p className="mt-1 text-xs text-slate-400">Generated code is not applied by this report view.</p></div>{report.target_branch && <span className="font-mono text-xs text-slate-400">Branch: {report.target_branch}</span>}</div>
        <div className="mt-4 overflow-hidden rounded-md border border-white/10 bg-[#090d14]">{report.code_patch ? <CodeDiff patch={report.code_patch} /> : <p className="p-5 text-sm text-slate-400">No patch recorded.</p>}</div>
      </section>

      {report.pr_url && <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-5"><h2 className="text-sm font-semibold text-emerald-100">Pull request created</h2><a href={report.pr_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm text-blue-200 underline underline-offset-2">{report.pr_url}</a><p className="mt-2 text-xs text-slate-400">This does not mean the change was merged, deployed, or resolved the incident.</p></section>}

      {Array.isArray(report.agent_findings) && report.agent_findings.length > 0 && <section className="rounded-lg border border-white/10 bg-[#0f151f] p-5"><h2 className="text-sm font-semibold text-white">Saved agent findings</h2><p className="mt-1 text-xs text-slate-400">Model-generated output as stored with this report.</p><ul className="mt-4 divide-y divide-white/10">{report.agent_findings.map((finding, index) => <li key={`${finding.agent_name}-${index}`} className="py-3"><p className="text-sm font-medium text-slate-200">{finding.agent_name} <span className="ml-2 text-xs font-normal text-slate-400">{finding.status}</span></p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-400">{finding.findings}</pre></li>)}</ul></section>}

      <footer className="border-t border-white/10 pt-5 text-xs text-slate-500">This report is private to your account. Use your normal code review and CI process before any merge or deployment.</footer>
    </main>
  );
}
