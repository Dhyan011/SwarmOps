import { useCallback, useEffect, useState } from "react";
import { HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineKey, HiOutlineLink } from "react-icons/hi2";
import api from "../services/api";

export default function SettingsPage() {
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [providerConfigured, setProviderConfigured] = useState(null);
  const [removingId, setRemovingId] = useState("");
  const [notice, setNotice] = useState("");

  const loadSettings = useCallback(async () => {
    const [installResult, healthResult] = await Promise.allSettled([
      api.get("/api/v1/github/installations"),
      api.get("/health"),
    ]);
    return {
      installations: installResult.status === "fulfilled" && Array.isArray(installResult.value.data) ? installResult.value.data : [],
      error: installResult.status === "rejected"
        ? installResult.reason?.response?.data?.detail || "GitHub connection status could not be loaded."
        : "",
      providerConfigured: healthResult.status === "fulfilled" ? Boolean(healthResult.value.data?.llm_configured) : null,
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError("");
    const result = await loadSettings();
    setInstallations(result.installations);
    setError(result.error);
    setProviderConfigured(result.providerConfigured);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    loadSettings().then((result) => {
      if (!active) return;
      setInstallations(result.installations);
      setError(result.error);
      setProviderConfigured(result.providerConfigured);
      setLoading(false);
    });
    return () => { active = false; };
  }, [loadSettings]);

  const connectGitHub = async () => {
    setError("");
    try {
      const { data } = await api.post("/api/v1/github/install-url");
      if (!data?.url) throw new Error("The server did not return an installation URL.");
      window.location.assign(data.url);
    } catch (cause) {
      setError(cause.response?.data?.detail || cause.message || "Could not start GitHub App installation.");
    }
  };

  const disconnectGitHub = async (installation) => {
    const id = String(installation.installation_id);
    if (!window.confirm(`Remove the SwarmOps link to ${installation.account_login}? This does not uninstall the GitHub App.`)) return;
    setRemovingId(id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/api/v1/github/installations/${encodeURIComponent(id)}`);
      setInstallations((current) => current.filter((item) => String(item.installation_id) !== id));
      setNotice("The SwarmOps link was removed. The GitHub App remains installed in GitHub.");
    } catch (cause) {
      setError(cause.response?.data?.detail || "Could not remove this GitHub link.");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <main className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-sm font-medium text-blue-200">Account and integrations</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Identity, repository access, and model execution are separate. This page reports only states returned by the backend.</p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-rose-300/20 bg-rose-300/5 p-4 text-sm text-rose-100">{error}<button type="button" onClick={refresh} className="ml-3 underline underline-offset-2">Retry</button></div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-emerald-100">{notice}</div>}

      <section className="rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-6" aria-labelledby="github-heading">
        <div className="flex items-start gap-3">
          <HiOutlineLink className="mt-0.5 h-5 w-5 text-blue-200" />
          <div className="flex-1">
            <h2 id="github-heading" className="text-lg font-semibold text-white">GitHub App access</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">GitHub is not your SwarmOps sign-in provider here. An installation grants repository access under the App’s configured permissions. A linked installation does not guarantee write access to every repository.</p>
          </div>
        </div>

        {loading ? <p className="mt-5 text-sm text-slate-400" role="status">Checking linked installations…</p> : installations.length ? (
          <ul className="mt-5 divide-y divide-white/10 rounded-lg border border-white/10">
            {installations.map((installation) => (
              <li key={installation.installation_id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-white">{installation.account_login || "GitHub account"}</p>
                  <p className="mt-1 text-xs text-slate-400">{installation.account_type || "Account"} · installation {installation.installation_id}</p>
                </div>
                <button type="button" onClick={() => disconnectGitHub(installation)} disabled={removingId === String(installation.installation_id)} className="min-h-9 rounded-md border border-white/15 px-3 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-60">{removingId === String(installation.installation_id) ? "Removing…" : "Remove SwarmOps link"}</button>
              </li>
            ))}
          </ul>
        ) : !loading ? (
          <div className="mt-5 rounded-lg border border-white/10 p-4">
            <p className="text-sm text-slate-300">No GitHub App installation is linked. You can still investigate with manually supplied context.</p>
            <button type="button" onClick={connectGitHub} className="mt-3 min-h-10 rounded-md bg-blue-300 px-4 font-semibold text-slate-950 hover:bg-blue-200">Connect GitHub App</button>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-6" aria-labelledby="model-heading">
        <div className="flex items-start gap-3">
          <HiOutlineKey className="mt-0.5 h-5 w-5 text-blue-200" />
          <div className="flex-1">
            <h2 id="model-heading" className="text-lg font-semibold text-white">Model provider</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">The current backend uses an OpenRouter-compatible provider configured by the deployment operator. Credentials are not stored in browser storage. Submitted incident descriptions, code, and supplied evidence may be sent to that configured model provider for analysis.</p>
            <div className="mt-4 flex items-center gap-2 text-sm">
              {providerConfigured === null ? <HiOutlineExclamationTriangle className="h-4 w-4 text-amber-200" /> : <HiOutlineCheckCircle className={`h-4 w-4 ${providerConfigured ? "text-emerald-200" : "text-amber-200"}`} />}
              <span className="text-slate-200">{providerConfigured === null ? "Provider status unavailable" : providerConfigured ? "Backend reports provider credentials configured" : "Backend reports provider credentials missing"}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">This reports configuration only; it does not verify model availability, account quota, or a successful model request.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
