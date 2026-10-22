// Backend URL. Set VITE_API_URL in frontend-react/.env (local) or in the Vercel project settings.
export const API_BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const WAKE_MESSAGE = "Waking up the server, this can take up to a minute…";
