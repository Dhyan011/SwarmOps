import { useEffect } from "react";
import { socket } from "../services/socket";

export default function useAgentSocket(incidentId, onEvent) {
  useEffect(() => {
    const handler = (event) => {
      if (!incidentId || event.incident_id === incidentId) {
        onEvent(event);
      }
    };
    socket.on("agent_event", handler);
    return () => socket.off("agent_event", handler);
  }, [incidentId, onEvent]);
}
