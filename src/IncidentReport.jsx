import { useContext } from "react";
import {
  IncidentContext,
} from "./IncidentContext";

function IncidentReport() {
  const { report } =
    useContext(IncidentContext);

  if (!report)
    return (
      <div className="bg-slate-900 p-5 rounded-xl">
        No Incident Yet
      </div>
    );

  return (
    <div className="bg-slate-900 p-5 rounded-xl">
      <h2 className="text-2xl font-bold mb-4">
        Root Cause Report
      </h2>

      <p>
        <b>ID:</b>{" "}
        {report.incident_id}
      </p>

      <p>
        <b>Agent:</b>{" "}
        {
          report.root_cause_agent
        }
      </p>

      <p>
        <b>Service:</b>{" "}
        {
          report.root_cause_service
        }
      </p>

      <p>
        <b>Summary:</b>{" "}
        {
          report.root_cause_summary
        }
      </p>

      <p>
        <b>Confidence:</b>{" "}
        {report.confidence}
      </p>

      <p>
        <b>Fix:</b>{" "}
        {
          report.recommended_fix
        }
      </p>
    </div>
  );
}

export default IncidentReport;