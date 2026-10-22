import axios from "axios";
import { create } from "zustand";
import toast from "react-hot-toast";
import { API_BASE } from "../api/config";

// The hosted backend (Render free plan) sleeps when idle and takes up to a minute to
// start again. We ping /health and show a banner while it wakes instead of failing silently.
const SLOW_AFTER_MS = 2500;
const RETRY_EVERY_MS = 5000;
const GIVE_UP_AFTER_MS = 3 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let polling = false;

const useServerStore = create((set, get) => ({
  status: "checking", // checking | waking | ready | down

  wakeServer: async () => {
    if (polling) return;
    polling = true;
    const slowTimer = setTimeout(() => {
      if (get().status !== "ready") set({ status: "waking" });
    }, SLOW_AFTER_MS);
    const deadline = Date.now() + GIVE_UP_AFTER_MS;

    for (;;) {
      try {
        await axios.get(`${API_BASE}/health`, { timeout: 10000 });
        clearTimeout(slowTimer);
        if (get().status === "waking") toast.success("Server is awake!");
        set({ status: "ready" });
        break;
      } catch {
        if (Date.now() > deadline) {
          clearTimeout(slowTimer);
          set({ status: "down" });
          break;
        }
        set({ status: "waking" });
        await sleep(RETRY_EVERY_MS);
      }
    }
    polling = false;
  },
}));

export default useServerStore;
