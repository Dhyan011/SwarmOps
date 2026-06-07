import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

export const createIncident = (data) => api.post("/api/v1/incident", data);
export const getIncidents = () => api.get("/api/v1/incidents");
export const getIncident = (id) => api.get(`/api/v1/incidents/${id}`);
export const handleIncidentAction = (id, action) => api.post(`/api/v1/incidents/${id}/action`, { action });
export const getHealth = () => api.get("/health");

export default api;