import { createContext, useState, useContext } from "react";

const IncidentContext = createContext();

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

export function useIncident() {
  return useContext(IncidentContext);
}
