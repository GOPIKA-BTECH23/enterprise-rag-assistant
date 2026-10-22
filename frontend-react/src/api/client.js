import axios from "axios";
import { API_BASE } from "./config";
import useServerStore from "../store/serverStore";

export { API_BASE };

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // No response at all = server unreachable (e.g. the Space is asleep) -> start waking it
    if (!err.response) useServerStore.getState().wakeServer();
    // A 401 from /login is just bad credentials; let the login form show the error
    if (err.response?.status === 401 && !err.config?.url?.endsWith("/login")) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const loginUser        = (creds)           => api.post("/login", creds);
export const logoutUser       = ()                => api.post("/logout");
export const askQuestion      = (question)        => api.post("/ask", { question });
export const getSuggestions   = (question)        => api.post("/suggestions", { question });
export const submitFeedback   = (query_id, value) => api.post("/feedback", { query_id, feedback: value });
export const getChatHistory   = (limit = 50)      => api.get(`/chat/history?limit=${limit}`);
export const getDocumentList  = ()                => api.get("/documents/list");
export const getEvalMetrics   = ()                => api.get("/metrics/evaluation");
export const getStats         = (days = 30)       => api.get(`/analytics/stats?days=${days}`);

export default api;
