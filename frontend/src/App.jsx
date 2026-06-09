import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { IncidentProvider } from "./context/IncidentContext";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import IncidentPage from "./pages/IncidentPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportPage from "./pages/ReportPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";

// AuthGuard Component
function AuthGuard({ children }) {
  const apiKey = localStorage.getItem("openrouter_api_key");
  const location = useLocation();

  if (!apiKey) {
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
                    <Route path="/incident/:id" element={<IncidentPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/report/:id" element={<ReportPage />} />
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
