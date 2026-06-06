import { useEffect } from "react";
import { socket } from "../services/socket";

function useAgentSocket(
  setEvents,
  setAgentStatus
) {
  useEffect(() => {
    socket.on(
      "agent_event",
      (message) => {
        setEvents((prev) => [
          message,
          ...prev,
        ]);

        setAgentStatus((prev) => ({
          ...prev,
          [message.agent]:
            message.event,
        }));
      }
    );

    return () => {
      socket.off("agent_event");
    };
  }, []);
}

export default useAgentSocket;