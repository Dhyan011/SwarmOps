import {
  createContext,
  useState,
} from "react";

export const IncidentContext =
  createContext();

export function IncidentProvider({
  children,
}) {
  const [report, setReport] =
    useState(null);

  const [events, setEvents] =
    useState([]);

  return (
    <IncidentContext.Provider
      value={{
        report,
        setReport,
        events,
        setEvents,
      }}
    >
      {children}
    </IncidentContext.Provider>
  );
}