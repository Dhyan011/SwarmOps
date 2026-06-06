import api from "../src/services/api";
import { useContext } from "react";
import {
  IncidentContext,
} from "./IncidentContext";

function ChaosPanel() {
  const { setReport } =
    useContext(IncidentContext);

  const triggerIncident =
    async (type) => {
      try {
        const payload = {
          incident_id:
            "INC-" +
            Date.now(),
          service:
            "UserService",
          severity: "high",
          description:
            type,
        };

        const response =
          await api.post(
            "/api/v1/alert",
            payload
          );

        setReport(
          response.data
        );
      } catch (err) {
        console.error(err);
      }
    };

  return (
    <div className="bg-slate-900 p-5 rounded-xl">
      <h2 className="text-xl font-bold mb-4">
        Chaos Simulator
      </h2>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            triggerIncident(
              "memory leak"
            )
          }
          className="bg-red-600 px-4 py-2 rounded"
        >
          Memory Leak
        </button>

        <button
          onClick={() =>
            triggerIncident(
              "cpu spike"
            )
          }
          className="bg-red-600 px-4 py-2 rounded"
        >
          CPU Spike
        </button>

        <button
          onClick={() =>
            triggerIncident(
              "database failure"
            )
          }
          className="bg-red-600 px-4 py-2 rounded"
        >
          Database Failure
        </button>
      </div>
    </div>
  );
}

export default ChaosPanel;