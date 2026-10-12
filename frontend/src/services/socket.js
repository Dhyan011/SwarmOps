import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  auth: (callback) => {
    const token = localStorage.getItem("supabase_access_token");
    callback(token ? { token } : {});
  },
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
