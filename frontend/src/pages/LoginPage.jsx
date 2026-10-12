import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiArrowRight, HiOutlineCodeBracket, HiOutlineShieldCheck } from "react-icons/hi2";
import api from "../services/api";
import { supabase } from "../services/supabase";

function safeDestination(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authUser, setAuthUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase));
  const [installations, setInstallations] = useState(null);
  const [installationError, setInstallationError] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState("");
  const destination = safeDestination(location.state?.from?.pathname);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError("Could not restore your session. Please try signing in again.");
        setAuthUser(data?.session?.user || null);
      })
      .catch(() => {
        if (active) setAuthError("Could not restore your session. Please try signing in again.");
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthUser(session?.user || null);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser) return undefined;
    let active = true;
    api.get("/api/v1/github/installations")
      .then(({ data }) => {
        if (active) {
          setInstallations(Array.isArray(data) ? data : []);
          setInstallationError("");
        }
      })
      .catch((error) => {
        if (active) {
          setInstallations([]);
          setInstallationError(error.response?.data?.detail || "GitHub connection status could not be loaded.");
        }
      });
    return () => { active = false; };
  }, [authUser]);

  const handleGoogleSignIn = async () => {
    setAuthError("");
    if (!supabase) {
      setAuthError("Google sign-in is not configured for this deployment. Contact the SwarmOps administrator.");
      return;
    }
    setBusy("google");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}` },
      });
      if (error) setAuthError(error.message || "Google sign-in could not be started.");
    } catch {
      setAuthError("Google sign-in could not be started. Check your connection and provider configuration.");
    } finally {
      setBusy("");
    }
  };

  const handleConnectGitHub = async () => {
    if (!authUser) {
      setAuthError("Sign in to SwarmOps before connecting repository access.");
      return;
    }
    setBusy("github");
    setAuthError("");
    try {
      const { data } = await api.post("/api/v1/github/install-url");
      if (!data?.url) throw new Error("The server did not return an installation URL.");
      window.location.assign(data.url);
    } catch (error) {
      setAuthError(error.response?.data?.detail || error.message || "Could not start GitHub App installation.");
      setBusy("");
    }
  };

  const continueToWorkspace = () => navigate(destination, { replace: true });
  const connected = Array.isArray(installations) && installations.length > 0;

  return (
    <main className="min-h-screen bg-[#090d14] px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-3 font-semibold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/10 text-blue-200" aria-hidden="true"><HiOutlineCodeBracket className="h-5 w-5" /></span>
            SwarmOps
          </Link>
          <Link to="/" className="text-sm text-slate-400 hover:text-white">Back to product</Link>
        </header>

        <div className="mx-auto mt-14 grid max-w-4xl gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-start">
          <section>
            <p className="text-sm font-medium text-blue-200">Your incident workspace</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Sign in to investigate with evidence.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Google establishes your SwarmOps identity. GitHub App access is a separate, optional connection for repository context and authorized pull-request actions.</p>

            <div className="mt-8 rounded-xl border border-white/10 bg-[#0f151f] p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><HiOutlineShieldCheck className="h-4 w-4 text-blue-200" /> Two separate permissions</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li><span className="mr-2 font-mono text-blue-200">01</span>Sign in to SwarmOps with Google.</li>
                <li><span className="mr-2 font-mono text-blue-200">02</span>Connect GitHub only if you want repository access.</li>
                <li><span className="mr-2 font-mono text-blue-200">03</span>Review proposed changes before an authorized PR is created.</li>
              </ol>
            </div>

            <p className="mt-5 text-xs leading-5 text-slate-400">You can start with manually supplied incident details without connecting GitHub. The model provider is configured by the deployment; model API keys are not stored in this browser.</p>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#0f151f] p-5 sm:p-6" aria-labelledby="signin-title">
            <h2 id="signin-title" className="text-lg font-semibold text-white">Sign in</h2>
            <p className="mt-2 text-sm text-slate-400">Your session is used to scope investigations to your account.</p>

            {sessionLoading ? (
              <div className="mt-6 flex items-center gap-3 text-sm text-slate-300" role="status"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-blue-200" /> Checking existing session…</div>
            ) : authUser ? (
              <div className="mt-6">
                <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-200">Signed in</p>
                  <p className="mt-1 break-all text-sm text-white">{authUser.email || authUser.user_metadata?.name || "Authenticated account"}</p>
                </div>
                <div className="mt-4 rounded-lg border border-white/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">GitHub repository access</p>
                      <p className="mt-1 text-xs text-slate-400">{installationError || (connected ? `${installations.length} installation${installations.length === 1 ? "" : "s"} linked` : "Not connected · optional for manual evidence")}</p>
                    </div>
                    {connected ? <span className="rounded-full border border-emerald-300/20 px-2.5 py-1 text-xs text-emerald-200">Linked</span> : null}
                  </div>
                  {!connected && <button type="button" onClick={handleConnectGitHub} disabled={busy === "github"} className="mt-3 rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-60">{busy === "github" ? "Opening GitHub…" : "Connect GitHub App"}</button>}
                </div>
                <button type="button" onClick={continueToWorkspace} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-300 px-4 font-semibold text-slate-950 hover:bg-blue-200">Continue to workspace <HiArrowRight className="h-4 w-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={handleGoogleSignIn} disabled={busy === "google" || !supabase} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg bg-white px-4 font-semibold text-slate-900 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold" aria-hidden="true">G</span>
                {busy === "google" ? "Opening Google…" : "Continue with Google"}
              </button>
            )}

            {!supabase && !sessionLoading && <p className="mt-3 text-xs leading-5 text-amber-100" role="status">Authentication configuration is missing. Set the public Supabase URL/key and enable the Google provider and callback URL in Supabase before sign-in.</p>}
            {authError && <p className="mt-4 rounded-lg border border-rose-300/20 bg-rose-300/5 p-3 text-sm text-rose-100" role="alert">{authError}</p>}
            {installationError && authUser && <p className="mt-3 text-xs text-amber-100" role="status">GitHub status could not be confirmed. You can still continue with manual evidence.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
