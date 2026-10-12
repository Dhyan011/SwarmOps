import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";
import { IncidentProvider } from "./context/IncidentContext";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import NewIncidentPage from "./pages/NewIncidentPage";
import IncidentPage from "./pages/IncidentPage";
import ReportPage from "./pages/ReportPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import SettingsPage from "./pages/SettingsPage";

function AuthGuard({ children }) {
  const location = useLocation();
  const [authState, setAuthState] = useState(() => ({ ready: !supabase, authenticated: false }));

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (active) setAuthState({ ready: true, authenticated: !error && Boolean(data?.session) });
      })
      .catch(() => {
        if (active) setAuthState({ ready: true, authenticated: false });
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAuthState({ ready: true, authenticated: Boolean(session) });
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authState.ready) {
    return <div className="flex min-h-screen items-center justify-center bg-[#090d14] text-sm text-slate-300" role="status">Checking your SwarmOps session…</div>;
  }
  if (!authState.authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <p className="font-mono text-sm text-blue-200">404 · Not found</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">This workspace page does not exist.</h1>
      <p className="mt-3 text-sm text-slate-300">The link may be outdated, or this feature may not be available in this version.</p>
      <Link to="/dashboard" className="mt-6 inline-flex min-h-10 items-center rounded-md bg-blue-300 px-4 font-semibold text-slate-950">Back to investigations</Link>
    </main>
  );
}

export default function App() {
  return (
    <IncidentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/*" element={
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/new-incident" element={<NewIncidentPage />} />
                  <Route path="/incident/:id" element={<IncidentPage />} />
                  <Route path="/report/:id" element={<ReportPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            </AuthGuard>
          } />
        </Routes>
      </BrowserRouter>
    </IncidentProvider>
  );
}
