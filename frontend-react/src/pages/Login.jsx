import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loginUser } from "../api/client";
import { WAKE_MESSAGE } from "../api/config";
import useAuthStore from "../store/authStore";

const DEMO = [
  { username: "john",  password: "password123", role: "employee" },
  { username: "alice", password: "password123", role: "hr" },
  { username: "bob",   password: "password123", role: "manager" },
  { username: "admin", password: "admin123",    role: "admin" },
];

const ROLE_COLOR = { employee: "text-indigo-600", hr: "text-pink-600", manager: "text-green-600", admin: "text-amber-600" };

export default function Login() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [form, setForm]     = useState({ username: "john", password: "password123", role: "employee" });
  const [loading, setLoading] = useState(false);

  const fill   = (u) => setForm({ username: u.username, password: u.password, role: u.role });
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.role) { toast.error("Please select a role"); return; }
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      setAuth(data.access_token, data.username, data.role);
      toast.success(`Welcome, ${data.username}!`);
      navigate("/");
    } catch (err) {
      toast.error(
        err.response
          ? err.response.data?.detail || "Login failed. Check credentials."
          : `${WAKE_MESSAGE} Please try again shortly.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden shadow-2xl">

        {/* Brand panel */}
        <div className="hidden md:flex flex-col flex-1 bg-gradient-to-br from-indigo-500 to-violet-600 p-12 text-white justify-between">
          <div>
            <div className="text-5xl mb-3">🧠</div>
            <h1 className="text-3xl font-bold leading-tight">Enterprise AI<br />Knowledge Assistant</h1>
            <p className="text-indigo-200 text-sm mt-2">React 19 · FastAPI · RAG · FAISS · Groq / LM Studio</p>
            <ul className="mt-8 space-y-3">
              {[
                "Role-based document access (RBAC)",
                "Strict no-hallucination answers",
                "Source citations with PDF downloads",
                "Real-time streaming responses (SSE)",
                "Analytics, feedback & trust metrics",
                "SQLite persistent storage",
              ].map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm opacity-90">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-indigo-300">Enterprise RAG Chatbot v3.0</p>
        </div>

        {/* Form panel */}
        <div className="w-full md:w-96 bg-white p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-sm text-slate-500 mb-6">Sign in to your workspace</p>

          <div className="bg-slate-50 border-l-4 border-indigo-500 rounded-lg p-3 mb-6">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2">Demo Credentials</p>
            {DEMO.map((u) => (
              <div key={u.username} onClick={() => fill(u)}
                className="flex justify-between cursor-pointer hover:bg-slate-100 px-2 py-1 rounded transition-colors text-xs text-slate-600">
                <span>{u.username} / {u.password}</span>
                <span className={`font-semibold ${ROLE_COLOR[u.role]}`}>{u.role}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Username", name: "username", type: "text" },
              { label: "Password", name: "password", type: "password" },
            ].map(({ label, name, type }) => (
              <div key={name}>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
                <input name={name} type={type} value={form[name]} onChange={change} required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition" />
              </div>
            ))}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
              <select name="role" value={form.role} onChange={change} required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition">
                <option value="">Select role…</option>
                <option value="employee">Employee</option>
                <option value="hr">HR Manager</option>
                <option value="manager">Department Manager</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all disabled:opacity-60 shadow-md hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0">
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
