import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiOutlineCodeBracket, HiOutlineLockClosed } from "react-icons/hi2";
import api from "../services/api";

function canonicalPublicRepo(value) {
  const url = new URL(value);
  const parts = url.pathname.split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password || url.search || url.hash || parts.length !== 2) return "";
  const repository = parts[1].replace(/\.git$/i, "");
  return parts[0] && repository ? `https://github.com/${parts[0]}/${repository}` : "";
}

export default function ContributePage() {
  const navigate = useNavigate();
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const handleScan = async (event) => {
    event.preventDefault();
    setError("");
    let target;
    try { target = canonicalPublicRepo(repositoryUrl.trim()); } catch { target = ""; }
    if (!target) {
      setError("Enter a public GitHub repository URL such as https://github.com/owner/repository.");
      return;
    }
    setScanning(true);
    try {
      const { data } = await api.post("/api/v1/contributions/scan", { repository_url: target });
      if (!data?.scan_id) throw new Error("The server did not return a scan ID.");
      navigate(`/contribution/${data.scan_id}`);
    } catch (cause) {
      setError(cause.response?.data?.detail || cause.message || "The repository could not be scanned. Check that it is public and try again.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-blue-200">Open-source contributions</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Find a small, useful change to contribute.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">Scan a public GitHub repository at a pinned commit. SwarmOps looks for one concrete, evidence-backed improvement and can prepare an issue and pull request for your review.</p>
      </header>

      <form onSubmit={handleScan} className="space-y-5 rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-7">
        <div>
          <label htmlFor="contribution-repo" className="mb-2 block text-sm font-medium text-white">Public GitHub repository</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="contribution-repo" type="url" required maxLength={500} value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="min-h-12 min-w-0 flex-1 rounded-md border border-white/15 bg-[#090d14] px-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-200 focus:outline-none" />
            <button type="submit" disabled={scanning || !repositoryUrl.trim()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-300 px-5 font-semibold text-slate-950 hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50">
              {scanning ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700/30 border-t-slate-900" /> Scanning…</> : <>Scan repository <HiArrowRight className="h-4 w-4" aria-hidden="true" /></>}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Public repositories only. Private repository access and private GitHub data are not requested.</p>
        </div>

        {error && <div role="alert" className="rounded-md border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-100">{error}</div>}

        <div className="grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <HiOutlineCodeBracket className="mt-0.5 h-5 w-5 shrink-0 text-blue-200" aria-hidden="true" />
            <div><h2 className="text-sm font-medium text-white">Evidence before suggestions</h2><p className="mt-1 text-xs leading-5 text-slate-400">The scan records the exact source commit. A suggested patch must apply to that snapshot and pass deterministic path and secret checks.</p></div>
          </div>
          <div className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <HiOutlineLockClosed className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" aria-hidden="true" />
            <div><h2 className="text-sm font-medium text-white">No action without your review</h2><p className="mt-1 text-xs leading-5 text-slate-400">Scanning is read-only. Only a security reviewer or administrator can publish, after reviewing the exact issue text, PR text, and diff.</p></div>
          </div>
        </div>
      </form>

      <aside className="rounded-lg border border-amber-200/15 bg-amber-200/[0.04] p-4 text-xs leading-5 text-slate-300">
        <strong className="text-amber-100">Data and limitations:</strong> readable public source files may be sent to your selected AI provider after common credential patterns and sensitive file paths are filtered. Do not scan repositories containing material you are not authorized to share. SwarmOps does not execute code or tests. A generated change is a proposal, not proof of correctness, approval, merge, or deployment.
      </aside>
    </main>
  );
}
