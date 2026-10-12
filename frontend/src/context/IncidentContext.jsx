import { useState } from "react";
import { IncidentContext } from "./incident-context";

export function IncidentProvider({ children }) {
  const [incidents, setIncidents] = useState([]);
  const [activeIncident, setActiveIncident] = useState(null);
  const [agentEvents, setAgentEvents] = useState([]);

  return (
    <IncidentContext.Provider
      value={{
        incidents,
        setIncidents,
        activeIncident,
        setActiveIncident,
        agentEvents,
        setAgentEvents,
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
}
