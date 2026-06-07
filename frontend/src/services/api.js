import axios from "axios";

// If VITE_API_URL is empty, it uses the current origin automatically
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

export const createIncident = (data) => api.post("/api/v1/incident", data);
export const getIncidents = () => api.get("/api/v1/incidents");
export const getIncident = (id) => api.get(`/api/v1/incidents/${id}`);
export const handleIncidentAction = (id, action) => api.post(`/api/v1/incidents/${id}/action`, { action });
export const getHealth = () => api.get("/health");

export default api;
