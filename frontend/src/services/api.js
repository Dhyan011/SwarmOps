import axios from "axios";

// If VITE_API_URL is empty, it uses the current origin automatically
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to attach the OpenRouter OAuth API Key
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("openrouter_api_key");
  if (token) {
    config.headers["X-API-Key"] = token;
  }
  return config;
});

export const exchangeOAuthCode = async (code) => {
  // Exchange code for API key directly with OpenRouter
  const response = await axios.post("https://openrouter.ai/api/v1/auth/keys", {
    code: code
  });
  return response.data; // Should contain the generated key
};

export const createIncident = (data) => api.post("/api/v1/incident", data);
export const getIncidents = () => api.get("/api/v1/incidents");
export const getIncident = (id) => api.get(`/api/v1/incidents/${id}`);
export const handleIncidentAction = (id, action) => api.post(`/api/v1/incidents/${id}/action`, { action });
export const getHealth = () => api.get("/health");

export default api;
