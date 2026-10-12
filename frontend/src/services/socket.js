import { io } from "socket.io-client";
import { getSupabaseAccessToken } from "./supabase";

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  auth: async (callback) => {
    try {
      const token = await getSupabaseAccessToken();
      callback(token ? { token } : {});
    } catch {
      callback({});
    }
  },
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});
