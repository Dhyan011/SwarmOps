import axios from "axios";
import { getSupabaseAccessToken } from "./supabase";

// If VITE_API_URL is empty, use the current origin.
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Supabase identity is sent separately from the deployment-managed model key.
api.interceptors.request.use(async (config) => {
  const accessToken = await getSupabaseAccessToken();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

export const createIncident = (data) => api.post("/api/v1/incident", data);
export const getIncidents = (params) => api.get("/api/v1/incidents", { params });
export const getIncident = (id) => api.get(`/api/v1/incidents/${id}`);
export const handleIncidentAction = (id, action) => api.post(`/api/v1/incidents/${id}/action`, { action });
export const getHealth = () => api.get("/health");
export const getGitHubInstallations = () => api.get("/api/v1/github/installations");
export const startGitHubInstallation = () => api.post("/api/v1/github/install-url");
export const scanPublicRepository = (repositoryUrl) => api.post("/api/v1/contributions/scan", { repository_url: repositoryUrl });
export const getContributionScan = (id) => api.get(`/api/v1/contributions/${id}`);
export const publishContribution = (id, payload) => api.post(`/api/v1/contributions/${id}/publish`, payload);

export default api;
