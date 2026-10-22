import { create } from "zustand";

const useAuthStore = create((set) => ({
  token:    localStorage.getItem("token")    || null,
  username: localStorage.getItem("username") || null,
  role:     localStorage.getItem("role")     || null,

  setAuth: (token, username, role) => {
    localStorage.setItem("token",    token);
    localStorage.setItem("username", username);
    localStorage.setItem("role",     role);
    set({ token, username, role });
  },

  clearAuth: () => {
    localStorage.clear();
    set({ token: null, username: null, role: null });
  },
}));

export default useAuthStore;
