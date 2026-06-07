import { BrowserRouter, Routes, Route } from "react-router-dom";
import { IncidentProvider } from "./context/IncidentContext";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import IncidentPage from "./pages/IncidentPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportPage from "./pages/ReportPage";
import LandingPage from "./pages/LandingPage";

export default function App() {
  return (
    <IncidentProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/*" 
            element={
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/incident/:id" element={<IncidentPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/report/:id" element={<ReportPage />} />
                </Routes>
              </Layout>
            } 
          />
        </Routes>
      </BrowserRouter>
    </IncidentProvider>
  );
}