import { useContext } from "react";
import { IncidentContext } from "./incident-context";

export function useIncident() {
  return useContext(IncidentContext);
}
