import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HiArrowTopRightOnSquare, HiArrowLeft, HiCheckCircle, HiExclamationTriangle } from "react-icons/hi2";
import api from "../services/api";
import { getGitHubInstallations, startGitHubInstallation } from "../services/api";
import { supabase } from "../services/supabase";

const emptyDraft = { issue_title: "", issue_body: "", pull_request_title: "", pull_request_body: "", patch: "" };

export default function ContributionReviewPage() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [actionError, setActionError] = useState("");
  const [installations, setInstallations] = useState([]);
  const [isReviewer, setIsReviewer] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [scanResponse, connectionResponse, sessionResponse] = await Promise.all([
          api.get(`/api/v1/contributions/${id}`),
          getGitHubInstallations(),
          supabase?.auth.getSession(),
        ]);
        if (!active) return;
        const value = scanResponse.data;
        setScan(value);
        setInstallations(Array.isArray(connectionResponse.data) ? connectionResponse.data : []);
        const rolesValue = sessionResponse?.data?.session?.user?.app_metadata?.roles ?? [];
        const roles = Array.isArray(rolesValue) ? rolesValue : [rolesValue];
        setIsReviewer(roles.includes("security_reviewer") || roles.includes("administrator"));
        const savedRequest = value.result?.publication?.request;
        const candidate = value.result?.candidate;
        setDraft(savedRequest || (candidate ? {
          issue_title: candidate.issue_title || "",
          issue_body: candidate.issue_body || "",
          pull_request_title: candidate.pull_request_title || "",
          pull_request_body: candidate.pull_request_body || "",
          patch: candidate.patch || "",
        } : emptyDraft));
      } catch (cause) {
        if (active) setLoadingError(cause.response?.data?.detail || "This contribution scan could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id]);

  const result = scan?.result;
  const candidate = result?.candidate;
  const publication = result?.publication;
  const hasLinkedInstallation = installations.length > 0;
  const partial = scan?.status === "pr_created_issue_failed";
  const alreadyPublished = scan?.status === "published";
  const canPublish = Boolean(candidate?.publication_allowed && isReviewer && hasLinkedInstallation && !alreadyPublished);
  const changed = useMemo(() => {
    if (!candidate) return false;
    return draft.issue_title !== candidate.issue_title || draft.issue_body !== candidate.issue_body || draft.pull_request_title !== candidate.pull_request_title || draft.pull_request_body !== candidate.pull_request_body || draft.patch !== candidate.patch;
  }, [candidate, draft]);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const handleConnect = async () => {
    setConnecting(true);
    setActionError("");
    try {
      const { data } = await startGitHubInstallation();
      if (!data?.url) throw new Error("GitHub did not return an installation link.");
      window.location.assign(data.url);
    } catch (cause) {
      setActionError(cause.response?.data?.detail || cause.message || "GitHub installation could not be started.");
      setConnecting(false);
    }
  };

  const handlePublish = async (event) => {
    event.preventDefault();
    setActionError("");
    if (!confirmed) {
      setActionError("Confirm the exact public payload before publishing.");
      return;
    }
    setPublishing(true);
    try {
      await api.post(`/api/v1/contributions/${id}/publish`, { ...draft, confirmed: true });
      const { data } = await api.get(`/api/v1/contributions/${id}`);
      setScan(data);
      setDraft(data.result?.publication?.request || draft);
      setConfirmed(false);
    } catch (cause) {
      setActionError(cause.response?.data?.detail || cause.response?.data?.message || "GitHub did not confirm publication.");
      try {
        const { data } = await api.get(`/api/v1/contributions/${id}`);
        setScan(data);
        if (data.result?.publication?.request) setDraft(data.result.publication.request);
      } catch { /* Keep the original error visible. */ }
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <main className="mx-auto max-w-4xl py-10 text-sm text-slate-300" role="status">Loading contribution scan…</main>;
  if (loadingError || !scan) return <main className="mx-auto max-w-3xl space-y-4 py-10"><p role="alert" className="text-sm text-rose-200">{loadingError || "Contribution scan not found."}</p><Link to="/contribute" className="inline-flex items-center gap-2 text-sm text-blue-200"><HiArrowLeft className="h-4 w-4" />Back to repository scans</Link></main>;

  return (
    <main className="mx-auto max-w-5xl space-y-7">
      <header>
        <Link to="/contribute" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><HiArrowLeft className="h-4 w-4" />New repository scan</Link>
        <p className="text-sm font-medium text-blue-200">Contribution review</p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-white">{result?.repository || "Repository scan"}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <a href={result?.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-200 hover:text-white">Scanned commit {result?.source_sha?.slice(0, 12)} <HiArrowTopRightOnSquare className="h-3.5 w-3.5" /></a>
          <span>Default branch: <code className="text-slate-200">{result?.default_branch}</code></span>
          <span>{result?.included_files} source files included</span>
          <span>{result?.redactions} credential-like values redacted before analysis</span>
        </div>
      </header>

      <section className="rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-6">
        <h2 className="text-sm font-semibold text-white">Scan finding</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{result?.summary}</p>
        {candidate ? <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-500">Category</p><p className="mt-1 text-sm text-white">{candidate.category}</p></div>
          <div className="rounded-lg border border-white/10 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-500">Priority / confidence</p><p className="mt-1 text-sm text-white">{candidate.priority} · {candidate.confidence}%</p></div>
          <div className="rounded-lg border border-white/10 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-500">Patch preflight</p><p className={`mt-1 text-sm ${candidate.patch_policy_state === "passed" ? "text-emerald-200" : "text-amber-200"}`}>{candidate.patch_policy_state}{candidate.policy_findings?.length ? ` · ${candidate.policy_findings.join(", ")}` : " · context checked"}</p></div>
          <div className="sm:col-span-3"><p className="text-xs uppercase tracking-wider text-slate-500">Affected files</p><ul className="mt-2 flex flex-wrap gap-2">{candidate.affected_files?.map((file) => <li key={file} className="rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-xs text-slate-300">{file}</li>)}</ul></div>
          <div className="sm:col-span-3"><p className="text-xs uppercase tracking-wider text-slate-500">Suggested test plan · not executed</p><ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5 text-slate-300">{candidate.test_plan?.map((test, index) => <li key={`${index}-${test}`}>{test}</li>)}</ul></div>
        </div> : <div className="mt-5 rounded-lg border border-amber-200/15 bg-amber-200/[0.04] p-4 text-sm text-amber-100">No safe, actionable issue was produced for this repository snapshot. Scan another repository or choose a different project area.</div>}
      </section>

      {publication?.pull_request?.url && <section className={`rounded-xl border p-4 ${alreadyPublished ? "border-emerald-300/20 bg-emerald-300/5" : "border-amber-300/20 bg-amber-300/5"}`}>
        <div className="flex items-start gap-3">
          {alreadyPublished ? <HiCheckCircle className="mt-0.5 h-5 w-5 text-emerald-200" /> : <HiExclamationTriangle className="mt-0.5 h-5 w-5 text-amber-200" />}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-white">{alreadyPublished ? "Issue and pull request created" : "Partial publication: pull request exists"}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">{alreadyPublished ? "GitHub confirmed both links. The PR is not merged and no tests were run by SwarmOps." : `Issue creation needs a retry${publication?.issue_error ? `: ${publication.issue_error}` : "."} Your PR already exists.`}</p>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <a href={publication.pull_request.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-200 hover:text-white">Pull request #{publication.pull_request.number} <HiArrowTopRightOnSquare className="h-4 w-4" /></a>
              {publication.issue?.url && <a href={publication.issue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-200 hover:text-white">Issue #{publication.issue.number} <HiArrowTopRightOnSquare className="h-4 w-4" /></a>}
            </div>
          </div>
        </div>
      </section>}

      {candidate && !alreadyPublished && <form onSubmit={handlePublish} className="space-y-5 rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Review the exact public payload</h2>
          <p className="mt-2 text-xs leading-5 text-slate-400">These values will be sent to GitHub. The issue will include a hidden idempotency marker so a retry does not create a duplicate. The repository is public. Review every field and the complete diff before confirming.</p>
        </div>
        {partial && <div className="rounded-md border border-amber-200/20 bg-amber-200/[0.05] p-3 text-xs leading-5 text-amber-100">This scan has already created the pull request. To retry issue creation safely, keep the exact same fields and diff below. Start a new scan if you need to change the contribution.</div>}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div><label htmlFor="issue-title" className="mb-2 block text-xs font-medium text-slate-200">GitHub issue title</label><input id="issue-title" maxLength={200} required disabled={partial || alreadyPublished} value={draft.issue_title} onChange={(event) => updateDraft("issue_title", event.target.value)} className="min-h-10 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white disabled:opacity-70" /></div>
            <div><label htmlFor="issue-body" className="mb-2 block text-xs font-medium text-slate-200">GitHub issue body</label><textarea id="issue-body" maxLength={8000} required disabled={partial || alreadyPublished} rows={12} value={draft.issue_body} onChange={(event) => updateDraft("issue_body", event.target.value)} className="w-full rounded-md border border-white/15 bg-[#090d14] px-3 py-2 font-mono text-xs leading-5 text-slate-200 disabled:opacity-70" /></div>
            <div><label htmlFor="pr-title" className="mb-2 block text-xs font-medium text-slate-200">Pull request title</label><input id="pr-title" maxLength={200} required disabled={partial || alreadyPublished} value={draft.pull_request_title} onChange={(event) => updateDraft("pull_request_title", event.target.value)} className="min-h-10 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white disabled:opacity-70" /></div>
            <div><label htmlFor="pr-body" className="mb-2 block text-xs font-medium text-slate-200">Pull request body</label><textarea id="pr-body" maxLength={8000} required disabled={partial || alreadyPublished} rows={10} value={draft.pull_request_body} onChange={(event) => updateDraft("pull_request_body", event.target.value)} className="w-full rounded-md border border-white/15 bg-[#090d14] px-3 py-2 font-mono text-xs leading-5 text-slate-200 disabled:opacity-70" /></div>
          </div>
          <div><label htmlFor="contribution-patch" className="mb-2 block text-xs font-medium text-slate-200">Exact unified diff</label><textarea id="contribution-patch" maxLength={30000} required disabled={partial || alreadyPublished} rows={34} spellCheck="false" value={draft.patch} onChange={(event) => updateDraft("patch", event.target.value)} className="w-full rounded-md border border-white/15 bg-[#090d14] px-3 py-2 font-mono text-[11px] leading-5 text-slate-200 disabled:opacity-70" /></div>
        </div>

        {!isReviewer && <p className="rounded-md border border-amber-200/15 bg-amber-200/[0.04] p-3 text-xs leading-5 text-amber-100">Your account does not have the trusted security_reviewer or administrator role required to publish. You can still review this scan.</p>}
        {isReviewer && !hasLinkedInstallation && <div className="rounded-md border border-blue-200/15 bg-blue-200/[0.04] p-3 text-xs leading-5 text-blue-100">Link a GitHub App installation that can access this repository. The app needs repository metadata read, Issues write, Contents write, and Pull requests write permission; GitHub may ask the installation owner to approve permission changes.<button type="button" onClick={handleConnect} disabled={connecting} className="mt-3 inline-flex min-h-9 items-center rounded-md border border-blue-200/30 px-3 text-xs font-semibold text-white hover:bg-blue-200/10 disabled:opacity-60">{connecting ? "Opening GitHub…" : "Connect GitHub App"}</button></div>}
        {changed && !partial && <p className="text-xs text-amber-100">You edited the generated proposal. The backend will rerun context, secret, and patch-policy checks before any GitHub write.</p>}
        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/10 p-4 text-xs leading-5 text-slate-200">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={!canPublish || publishing} className="mt-1 h-4 w-4 accent-blue-300" />
          <span>I reviewed the repository, source commit, issue text, PR text, and exact diff. I understand these actions publish publicly on GitHub, GitHub may notify subscribers, and SwarmOps has not run the proposed tests.</span>
        </label>
        {actionError && <div role="alert" className="rounded-md border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-100">{actionError}</div>}
        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">Target: <a className="text-blue-200" href={result?.target_url} target="_blank" rel="noreferrer">{result?.target_url}</a> · base <code>{result?.default_branch}</code> · commit <code>{result?.source_sha?.slice(0, 12)}</code></p>
          <button type="submit" disabled={!canPublish || !confirmed || publishing} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-300 px-5 font-semibold text-slate-950 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50">{publishing ? "Publishing to GitHub…" : partial ? "Retry issue creation" : "Create GitHub issue and pull request"}</button>
        </div>
      </form>}
    </main>
  );
}
