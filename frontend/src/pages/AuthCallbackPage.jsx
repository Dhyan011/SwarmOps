import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase";

function safeDestination(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/dashboard";
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(() => {
    if (!supabase) return "Supabase authentication is not configured for this deployment.";
    return searchParams.get("error_description") || searchParams.get("error") || "";
  });

  useEffect(() => {
    if (!supabase || error) return undefined;
    let active = true;
    const destination = safeDestination(searchParams.get("next"));
    const finish = (session) => {
      if (active && session) navigate(destination, { replace: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => finish(session));
    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError("Your sign-in session could not be confirmed. Please try again.");
        else if (data?.session) finish(data.session);
        else setError("No active session was returned. The sign-in may have been cancelled or expired.");
      })
      .catch(() => {
        if (active) setError("Sign-in could not be completed. Please return and try again.");
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [error, navigate, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090d14] px-5 text-slate-100">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-[#0f151f] p-6" aria-live="polite">
        {error ? (
          <>
            <h1 className="text-xl font-semibold text-white">Sign-in needs attention</h1>
            <p className="mt-3 text-sm leading-6 text-rose-100" role="alert">{error}</p>
            <Link to="/login" className="mt-5 inline-flex min-h-10 items-center rounded-md bg-blue-300 px-4 font-semibold text-slate-950">Return to sign in</Link>
          </>
        ) : (
          <div role="status" className="flex items-center gap-3 text-sm text-slate-200"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-blue-200" /> Confirming your SwarmOps session…</div>
        )}
      </section>
    </main>
  );
}
