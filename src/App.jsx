import { BrowserRouter, Routes, Route } from "react-router-dom";

import IncidentInput from "./pages/IncidentInput";
import IncidentAnalysisPage from "./pages/IncidentAnalysisPage";
import Dashboard from "./pages/Dashboard";
import InvestigationPage from "./pages/InvestigationPage";
import ResolutionPage from "./pages/ResolutionPage";
import AutoFixPage from "./pages/AutoFixPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import IncidentReportPage from "./pages/IncidentReportPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<IncidentInput />} />

        <Route
          path="/analysis"
          element={<IncidentAnalysisPage />}
        />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/investigation"
          element={<InvestigationPage />}
        />

        <Route
          path="/resolution"
          element={<ResolutionPage />}
        />

        <Route
          path="/autofix"
          element={<AutoFixPage />}
        />

        <Route
          path="/analytics"
          element={<AnalyticsPage />}
        />

        <Route
          path="/report"
          element={<IncidentReportPage />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;