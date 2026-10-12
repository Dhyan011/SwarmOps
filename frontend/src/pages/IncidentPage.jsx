import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  HiArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentArrowDown,
  HiOutlineExclamationTriangle,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import CodeDiff from "../components/CodeDiff";
import StatusBadge from "../components/StatusBadge";
import { getIncident, handleIncidentAction } from "../services/api";
import { useIncident } from "../context/useIncident";
import { supabase } from "../services/supabase";

const statusStyles = {
  investigating: ["running", "Investigating"],
  awaiting_review: ["review", "Awaiting human review"],
  needs_review: ["review", "Manual review required"],
  validation_failed: ["failure", "Validation failed"],
  pr_created: ["pr", "Pull request created"],
  rejected: ["failure", "Proposal rejected"],
  failed: ["failure", "Investigation failed"],
};

function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not recorded" : date.toLocaleString();
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "Not recorded";
  const seconds = Math.round(milliseconds / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function readValidation(text) {
  if (!text) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function FindingCard({ finding }) {
  let display = finding.findings || "No finding text was recorded.";
  try {
    const parsed = JSON.parse(display);
    if (parsed && typeof parsed === "object") display = JSON.stringify(parsed, null, 2);
  } catch {
    // Keep non-JSON provider text readable; never claim it is verified.
  }
  return (
    <details className="border-b border-white/10 py-4 last:border-b-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-sm font-medium text-white">
        <span>{finding.agent_name || "Agent"}</span>
        <span className="flex items-center gap-3 text-xs font-normal text-slate-400">
          {finding.duration_ms > 0 && <span>{formatDuration(finding.duration_ms)}</span>}
          <span>{finding.status === "error" ? "Error" : "Completed"}</span>
        </span>
      </summary>
      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#090d14] p-4 font-mono text-xs leading-5 text-slate-300">{display}</pre>
      {Array.isArray(finding.recommendations) && finding.recommendations.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-300">{finding.recommendations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
      )}
    </details>
  );
}

export default function IncidentPage() {
  const { id } = useParams();
  const { setActiveIncident } = useIncident();
  const [loadState, setLoadState] = useState({ id: null, incident: null, loading: true, error: "" });
  const [canReview, setCanReview] = useState(false);
  const [reviewRoleLoaded, setReviewRoleLoaded] = useState(() => !supabase);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    getIncident(id)
      .then(({ data }) => {
        if (!active) return;
        setLoadState({ id, incident: data, loading: false, error: "" });
        setActiveIncident(data);
      })
      .catch((cause) => {
        if (!active) return;
        setLoadState({ id, incident: null, loading: false, error: cause.response?.status === 404 ? "This investigation was not found in your account." : "The investigation could not be loaded. Please retry." });
      });
    return () => { active = false; };
  }, [id, setActiveIncident]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const roles = data?.session?.user?.app_metadata?.roles;
      const roleList = Array.isArray(roles) ? roles : typeof roles === "string" ? [roles] : [];
      setCanReview(roleList.some((role) => ["security_reviewer", "administrator"].includes(role)));
      setReviewRoleLoaded(true);
    }).catch(() => { if (active) setReviewRoleLoaded(true); });
    return () => { active = false; };
  }, []);

  const incident = loadState.id === id ? loadState.incident : null;
  const loading = loadState.id !== id || loadState.loading;
  const status = incident?.status || "unknown";
  const [statusVariant, statusLabel] = statusStyles[status] || ["neutral", status === "unknown" ? "Unknown status" : status.replaceAll("_", " ")];
  const validation = readValidation(incident?.validation_result);
  const isEligible = status === "awaiting_review"
    && incident?.validation_state === "validation_passed"
    && incident?.policy_state === "passed"
    && Boolean(incident?.code_patch)
    && Boolean(incident?.target_url);
  const prTitle = incident?.pr_title || `SwarmOps remediation: ${(incident?.description || "Incident").slice(0, 150)}`;
  const prBody = incident?.pr_body || incident?.root_cause || "Human-reviewed SwarmOps remediation proposal.";

  const reload = async () => {
    if (!id) return;
    setActionError("");
    try {
      const { data } = await getIncident(id);
      setLoadState({ id, incident: data, loading: false, error: "" });
      setActiveIncident(data);
    } catch (cause) {
      setActionError(cause.response?.data?.detail || "Could not refresh the investigation.");
    }
  };

  const runAction = async (action) => {
    setActionBusy(true);
    setActionError("");
    try {
      await handleIncidentAction(id, action);
      setApprovalOpen(false);
      setApprovalConfirmed(false);
      await reload();
    } catch (cause) {
      setActionError(cause.response?.data?.detail || `Could not ${action} this proposal.`);
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-300" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-blue-200" /> Loading investigation…</div>;
  if (!incident) return (
    <main className="mx-auto max-w-xl py-16 text-center">
      <HiOutlineExclamationTriangle className="mx-auto h-8 w-8 text-amber-200" />
      <h1 className="mt-4 text-2xl font-semibold text-white">Investigation unavailable</h1>
      <p className="mt-3 text-sm text-slate-300">{loadState.id === id ? loadState.error : "This investigation could not be loaded."}</p>
      <div className="mt-5 flex justify-center gap-3"><button type="button" onClick={reload} className="rounded-md border border-white/15 px-4 py-2 text-sm text-white">Retry</button><Link to="/dashboard" className="rounded-md bg-blue-300 px-4 py-2 text-sm font-semibold text-slate-950">Investigations</Link></div>
    </main>
  );

  return (
    <main className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><HiArrowLeft className="h-4 w-4" /> Investigations</Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-white">#{incident.incident_id?.slice(0, 12) || id}</h1>
            <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-200">{incident.description}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400">
            <span>{incident.service || "Unknown service"}</span><span>Severity: {incident.severity || "unknown"}</span><span>Created {formatDate(incident.created_at)}</span><span>Analysis time {formatDuration(incident.resolution_time_ms)}</span>
          </div>
        </div>
        <Link to={`/report/${encodeURIComponent(id)}`} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/5"><HiOutlineDocumentArrowDown className="h-4 w-4" /> Full report</Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Investigation evidence and model assessment">
        <article className="rounded-lg border border-white/10 bg-[#0f151f] p-5">
          <h2 className="text-sm font-semibold text-white">Evidence and repository context</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Incident description</p><p className="mt-2 whitespace-pre-wrap leading-6 text-slate-200">{incident.description}</p><p className="mt-1 text-[11px] text-blue-200">User supplied</p></div>
            <div className="border-t border-white/10 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Logs / code / notes</p>{incident.user_supplied_evidence ? <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#090d14] p-3 font-mono text-xs leading-5 text-slate-300">{incident.user_supplied_evidence}</pre> : <p className="mt-2 text-sm text-slate-400">No user-supplied evidence was retained with this report.</p>}<p className="mt-1 text-[11px] text-blue-200">Source: user supplied</p></div>
            <div className="border-t border-white/10 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">GitHub repository</p>{incident.target_url ? <a href={incident.target_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm text-blue-200 underline underline-offset-2">{incident.target_url}</a> : <p className="mt-2 text-sm text-slate-400">No repository supplied</p>}<p className="mt-1 text-[11px] text-slate-500">Public context is not write authorization.</p></div>
          </div>
        </article>

        <article className="rounded-lg border border-white/10 bg-[#0f151f] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-semibold text-white">AI-generated hypothesis</h2><span className="text-xs text-slate-400">Not independently verified</span></div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">{incident.root_cause || "No root cause hypothesis was recorded."}</p>
          <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Recommended fix</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{incident.recommended_fix || "No fix description was recorded."}</p></div>
        </article>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f151f] p-5" aria-labelledby="validation-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="validation-heading" className="flex items-center gap-2 text-sm font-semibold text-white"><HiOutlineShieldCheck className="h-4 w-4 text-blue-200" /> Validation and policy gates</h2><StatusBadge variant={incident.validation_state === "validation_passed" ? "pr" : incident.validation_state === "validation_failed" ? "failure" : "review"}>{(incident.validation_state || "needs_manual_review").replaceAll("_", " ")}</StatusBadge></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md border border-white/10 p-3"><p className="text-xs text-slate-400">AI validation</p><p className="mt-1 text-sm text-white">{validation?.validation_status || "Not verified"}</p></div>
          <div className="rounded-md border border-white/10 p-3"><p className="text-xs text-slate-400">Deterministic patch policy</p><p className="mt-1 text-sm text-white">{incident.policy_state || "Not checked"}</p></div>
          <div className="rounded-md border border-white/10 p-3"><p className="text-xs text-slate-400">Tests</p><p className="mt-1 text-sm text-amber-100">{incident.tests_executed ? "Execution reported" : "Not run by SwarmOps"}</p></div>
        </div>
        {validation?.final_recommendation && <p className="mt-4 rounded-md border border-white/10 p-3 text-sm leading-6 text-slate-300">{validation.final_recommendation}</p>}
        {Array.isArray(incident.policy_findings) && incident.policy_findings.length > 0 && <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-100">{incident.policy_findings.map((finding, index) => <li key={`${index}-${finding}`}>{finding}</li>)}</ul>}
        <p className="mt-4 text-xs leading-5 text-slate-500">A passing AI verdict is not a test run. Review the proposed code and verify it in your own CI before merging.</p>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#0f151f] p-5" aria-labelledby="patch-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="patch-heading" className="text-sm font-semibold text-white">Proposed code change</h2><p className="mt-1 text-xs text-slate-400">Generated by the model; not applied to the repository.</p></div>{incident.target_branch && <span className="font-mono text-xs text-slate-400">Target branch: {incident.target_branch}</span>}</div>
        <div className="mt-4 overflow-hidden rounded-md border border-white/10 bg-[#090d14]">{incident.code_patch ? <CodeDiff patch={incident.code_patch} /> : <p className="p-5 text-sm text-slate-400">No patch was generated.</p>}</div>
      </section>

      {Array.isArray(incident.agent_findings) && incident.agent_findings.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-[#0f151f] p-5" aria-labelledby="agent-heading">
          <h2 id="agent-heading" className="text-sm font-semibold text-white">Recorded agent findings</h2>
          <p className="mt-1 text-xs text-slate-400">These are model-generated summaries from the saved report, not a live feed.</p>
          <div className="mt-3">{incident.agent_findings.map((finding, index) => <FindingCard key={`${finding.agent_name}-${index}`} finding={finding} />)}</div>
        </section>
      )}

      {Array.isArray(incident.phases) && incident.phases.length > 0 && (
        <section className="rounded-lg border border-white/10 bg-[#0f151f] p-5" aria-labelledby="phase-heading">
          <h2 id="phase-heading" className="flex items-center gap-2 text-sm font-semibold text-white"><HiOutlineClock className="h-4 w-4 text-slate-300" />Recorded pipeline phases</h2>
          <ol className="mt-4 space-y-2">{incident.phases.map((phase, index) => <li key={`${phase.phase}-${index}`} className="flex items-center justify-between gap-4 border-t border-white/10 py-3 first:border-0"><span className="text-sm text-slate-200">{String(phase.phase || "Phase").replaceAll("_", " ")}</span><StatusBadge variant={phase.status === "completed" ? "pr" : phase.status === "failed" ? "failure" : "neutral"}>{phase.status || "Recorded"}</StatusBadge></li>)}</ol>
        </section>
      )}

      {incident.pr_url && (
        <section className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-5">
          <p className="text-sm font-semibold text-emerald-100">Pull request created</p>
          <a href={incident.pr_url} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-sm text-blue-200 underline underline-offset-2">{incident.pr_url}</a>
          <p className="mt-2 text-xs text-slate-400">The PR has not been merged or deployed by SwarmOps. Follow your normal review and CI process.</p>
        </section>
      )}

      {(status === "awaiting_review" || status === "needs_review") && !incident.pr_url && (
        <section className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-5" aria-labelledby="review-action-heading">
          <h2 id="review-action-heading" className="text-sm font-semibold text-amber-100">Human decision required</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Review the evidence, policy findings, and full proposed diff above. SwarmOps will not merge or deploy this change.</p>
          {actionError && <p role="alert" className="mt-3 rounded-md border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-100">{actionError}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            {isEligible && canReview && <button type="button" onClick={() => setApprovalOpen(true)} disabled={actionBusy} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-300 px-4 font-semibold text-slate-950 hover:bg-blue-200 disabled:opacity-60"><HiOutlineCheckCircle className="h-4 w-4" /> Review and create pull request</button>}
            {isEligible && !canReview && <p className="self-center text-xs text-amber-100">{reviewRoleLoaded ? "A security_reviewer or administrator role is required to create a pull request." : "Checking reviewer permissions…"}</p>}
            <button type="button" onClick={() => runAction("reject")} disabled={actionBusy} className="min-h-10 rounded-md border border-white/15 px-4 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-60">Reject proposal</button>
          </div>
          {!isEligible && <p className="mt-3 text-xs text-slate-400">This report does not meet all automatic approval gates. A pull request cannot be created from it.</p>}
        </section>
      )}

      {approvalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="confirm-pr-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#0f151f] p-5 shadow-2xl sm:p-6">
            <h2 id="confirm-pr-title" className="text-lg font-semibold text-white">Confirm pull-request creation</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">This action will create a GitHub pull request in the repository below. Review every field and the patch before continuing.</p>
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Repository</dt><dd className="mt-1 break-all text-blue-200">{incident.target_url}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Target branch</dt><dd className="mt-1 font-mono text-slate-200">{incident.target_branch || "Repository default branch"}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Pull-request title</dt><dd className="mt-1 whitespace-pre-wrap text-slate-200">{prTitle}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Pull-request description</dt><dd className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap rounded-md bg-[#090d14] p-3 text-slate-300">{prBody}</dd></div>
              <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Patch to be submitted</dt><dd className="mt-1 max-h-48 overflow-auto rounded-md bg-[#090d14] p-3"><pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-300">{incident.code_patch}</pre></dd></div>
            </dl>
            <label className="mt-5 flex items-start gap-3 rounded-md border border-white/10 p-3 text-sm leading-5 text-slate-200"><input type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} className="mt-1 accent-blue-300" />I have reviewed the repository, title, description, and patch. I understand this creates a pull request only; it will not merge or deploy the change.</label>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => { setApprovalOpen(false); setApprovalConfirmed(false); }} disabled={actionBusy} className="min-h-10 rounded-md border border-white/15 px-4 text-sm text-slate-200">Cancel</button>
              <button type="button" onClick={() => runAction("approve")} disabled={!approvalConfirmed || actionBusy} className="min-h-10 rounded-md bg-blue-300 px-4 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{actionBusy ? "Creating pull request…" : "Create GitHub pull request"}</button>
            </div>
          </section>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500"><span>Created {formatDate(incident.created_at)} · Analysis time {formatDuration(incident.resolution_time_ms)}</span><button type="button" onClick={reload} className="text-blue-200 hover:text-white">Refresh report</button></footer>
    </main>
  );
}
