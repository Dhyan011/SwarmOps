import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft, HiOutlineCodeBracket, HiOutlineServerStack } from "react-icons/hi2";
import { createIncident } from "../services/api";
import { useIncident } from "../context/IncidentContext";

function normalizeGithubRepo(rawUrl) {
  const url = new URL(rawUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || parts.length !== 2) return "";
  const repository = parts[1].replace(/\.git$/i, "");
  if (!parts[0] || !repository) return "";
  return `https://github.com/${parts[0]}/${repository}`;
}

export default function NewIncidentPage() {
  const navigate = useNavigate();
  const { setIncidents } = useIncident();
  const [description, setDescription] = useState("");
  const [service, setService] = useState("");
  const [severity, setSeverity] = useState("unknown");
  const [evidence, setEvidence] = useState("");
  const [contextUrl, setContextUrl] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!description.trim()) {
      setError("Describe what is failing so the investigation has a starting point.");
      return;
    }
    let normalizedRepo = "";
    if (contextUrl.trim()) {
      try { normalizedRepo = normalizeGithubRepo(contextUrl.trim()); } catch { normalizedRepo = ""; }
      if (!normalizedRepo) {
        setError("Enter a public HTTPS GitHub repository in https://github.com/owner/repository form, or leave this field blank.");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        description: description.trim(),
        service: service.trim() || "unknown",
        severity,
        code_snippet: evidence.trim(),
        target_url: normalizedRepo,
      };
      const { data } = await createIncident(payload);
      if (!data?.incident_id) throw new Error("The server did not return an investigation ID.");
      setIncidents((previous) => [data, ...previous.filter((item) => item.incident_id !== data.incident_id)]);
      navigate(`/incident/${data.incident_id}`);
    } catch (cause) {
      setError(cause.response?.data?.detail || cause.message || "The investigation could not be started. Check configuration and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-7">
      <header>
        <button type="button" onClick={() => navigate("/dashboard")} className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><HiArrowLeft className="h-4 w-4" /> Back to investigations</button>
        <p className="text-sm font-medium text-blue-200">New investigation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Start with what you know.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">You do not need complete telemetry to begin. Add symptoms and any evidence you have; missing information will remain visible rather than being guessed.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-7 rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-7">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="incident-description" className="text-sm font-medium text-white">What is happening? <span className="text-rose-200">*</span></label>
            <span className="text-xs text-slate-500">{description.length}/5,000</span>
          </div>
          <textarea id="incident-description" required maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the error, when it started, and what users or systems are affected…" className="w-full rounded-md border border-white/15 bg-[#090d14] px-3 py-3 text-sm leading-6 text-white placeholder:text-slate-500 focus:border-blue-200 focus:outline-none" />
          <p className="mt-2 text-xs text-slate-500">This is user-supplied context. Avoid including credentials, personal data, or secrets.</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="incident-service" className="mb-2 block text-sm font-medium text-white">Affected service <span className="font-normal text-slate-500">(optional)</span></label>
            <div className="relative"><HiOutlineServerStack className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="incident-service" type="text" maxLength={100} value={service} onChange={(event) => setService(event.target.value)} placeholder="e.g. checkout-api" className="min-h-11 w-full rounded-md border border-white/15 bg-[#090d14] pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-200 focus:outline-none" /></div>
          </div>
          <div>
            <label htmlFor="incident-severity" className="mb-2 block text-sm font-medium text-white">Severity <span className="font-normal text-slate-500">(if known)</span></label>
            <select id="incident-severity" value={severity} onChange={(event) => setSeverity(event.target.value)} className="min-h-11 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white focus:border-blue-200 focus:outline-none">
              <option value="unknown">Not sure</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="incident-context-url" className="mb-2 block text-sm font-medium text-white">Public GitHub repository <span className="font-normal text-slate-500">(optional)</span></label>
          <input id="incident-context-url" type="url" maxLength={500} value={contextUrl} onChange={(event) => setContextUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="min-h-11 w-full rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-200 focus:outline-none" />
          <p className="mt-2 text-xs leading-5 text-slate-500">Public repository content may be fetched as read-only context. This does not authorize writes. Creating a pull request separately requires a linked GitHub App installation, repository permission, and an authorized reviewer.</p>
        </div>

        <section className="border-t border-white/10 pt-5" aria-labelledby="evidence-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="evidence-heading" className="text-sm font-medium text-white">Add evidence you already have</h2>
              <p className="mt-1 text-xs text-slate-500">Manual evidence is labelled as user-supplied; it is not a live monitoring connection.</p>
            </div>
            <button type="button" onClick={() => setShowEvidence((value) => !value)} className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/5 sm:self-auto"><HiOutlineCodeBracket className="h-4 w-4" />{showEvidence ? "Hide evidence" : "Add logs or stack trace"}</button>
          </div>
          {showEvidence && <div className="mt-4"><label htmlFor="incident-evidence" className="mb-2 block text-sm text-slate-200">Logs, stack trace, code, or other notes <span className="text-xs text-slate-500">(user supplied · max 50,000 characters)</span></label><textarea id="incident-evidence" maxLength={50000} rows={7} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Paste relevant, redacted evidence here…" className="w-full rounded-md border border-white/15 bg-[#090d14] px-3 py-3 font-mono text-xs leading-5 text-slate-200 placeholder:text-slate-500 focus:border-blue-200 focus:outline-none" /><p className="mt-2 text-right text-xs text-slate-500">{evidence.length}/50,000</p></div>}
        </section>

        {error && <div role="alert" className="rounded-md border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-100">{error}</div>}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-5 text-slate-500">The backend must have model-provider credentials configured. AI findings are hypotheses; generated tests are not run by the current system.</p>
          <button type="submit" disabled={submitting || !description.trim()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-300 px-5 font-semibold text-slate-950 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700/30 border-t-slate-900" /> Starting investigation…</> : "Start investigation"}
          </button>
        </div>
      </form>
    </main>
  );
}
