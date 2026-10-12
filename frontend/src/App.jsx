import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./services/supabase";
import { IncidentProvider } from "./context/IncidentContext";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import NewIncidentPage from "./pages/NewIncidentPage";
import IncidentPage from "./pages/IncidentPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportPage from "./pages/ReportPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MemoryPage from "./pages/MemoryPage";
import SettingsPage from "./pages/SettingsPage";

// AuthGuard Component
function AuthGuard({ children }) {
  const location = useLocation();
  const [authState, setAuthState] = useState({ ready: false, authenticated: false });

  useEffect(() => {
    if (!supabase) {
      setAuthState({ ready: true, authenticated: false });
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthState({ ready: true, authenticated: Boolean(data.session) });
    }).catch(() => setAuthState({ ready: true, authenticated: false }));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({ ready: true, authenticated: Boolean(session) });
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!authState.ready) return <div className="min-h-screen" aria-label="Checking authentication" />;
  if (!authState.authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <IncidentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/*" 
            element={
              <AuthGuard>
                <Layout>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/new-incident" element={<NewIncidentPage />} />
                    <Route path="/incident/:id" element={<IncidentPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/report/:id" element={<ReportPage />} />
                    <Route path="/memory" element={<MemoryPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </Layout>
              </AuthGuard>
            } 
          />
        </Routes>
      </BrowserRouter>
    </IncidentProvider>
  );
}
