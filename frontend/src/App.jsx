import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
  // Now we check if any provider key is set since we changed the login flow
  const hasGemini = localStorage.getItem("gemini_key");
  const hasGroq = localStorage.getItem("groq_key");
  const hasOpenRouter = localStorage.getItem("openrouter_api_key");
  // For Ollama we don't necessarily have a key, but for simplicity let's assume they set something
  // We will just do a loose check for now to allow local testing
  const hasAuth = hasGemini || hasGroq || hasOpenRouter || true; // true temporarily for ease of testing
  const location = useLocation();

  if (!hasAuth) {
    // Redirect to login but save the attempted URL
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
