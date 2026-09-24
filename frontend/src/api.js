import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("agrovision.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(undefined, (error) => {
  const token = sessionStorage.getItem("agrovision.token");
  const isAuthSubmission = String(error.config?.url || "").includes("/api/auth/login")
    || String(error.config?.url || "").includes("/api/auth/register");
  if (error.response?.status === 401 && token && !isAuthSubmission) {
    sessionStorage.removeItem("agrovision.token");
    window.dispatchEvent(new Event("agrovision:session-expired"));
  }
  return Promise.reject(error);
});

export function apiErrorKey(error) {
  if (!error?.response) return "common.networkError";
  const status = error.response.status;
  if (status === 401) return "errors.unauthorized";
  if (status === 403) return "errors.forbidden";
  if (status === 404) return "errors.notFound";
  if (status === 413) return "errors.tooLarge";
  if (status === 422) return String(error.config?.url || "").includes("/api/predictions/analyze")
    ? "errors.invalidImage"
    : "errors.generic";
  if (status === 503) {
    const detail = String(error.response.data?.detail || "").toLowerCase();
    if (detail.includes("model")) return "errors.modelUnavailable";
    if (detail.includes("database")) return "errors.databaseUnavailable";
    return "common.backendUnavailable";
  }
  return "errors.generic";
}

export async function fetchProtectedImage(path) {
  const response = await api.get(path, { responseType: "blob" });
  return URL.createObjectURL(response.data);
}
