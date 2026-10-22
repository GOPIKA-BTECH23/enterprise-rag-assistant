import toast from "react-hot-toast";
import { logoutUser } from "../../api/client";
import useAuthStore from "../../store/authStore";

const NAV = [
  { id: "chat",      icon: "💬", label: "Chat" },
  { id: "history",   icon: "🕐", label: "History" },
  { id: "documents", icon: "📁", label: "Documents" },
  { id: "metrics",   icon: "📊", label: "Metrics" },
];

const QUICK_QUESTIONS = {
  employee: ["What is the leave policy?",   "How many sick days do I get?",     "What is the WFH policy?",   "Code of conduct?"],
  hr:       ["What is the recruitment process?", "How is payroll calculated?",  "What are selection criteria?"],
  manager:  ["Performance review process?", "What are promotion criteria?",     "How do I evaluate an employee?"],
  admin:    ["Show me all user stats",       "What are system metrics?",         "Summarise all policies"],
};

const ROLE_BADGE = {
  employee: "bg-indigo-900/40 text-indigo-300",
  hr:       "bg-pink-900/40   text-pink-300",
  manager:  "bg-green-900/40  text-green-300",
  admin:    "bg-amber-900/40  text-amber-300",
};

export default function Sidebar({ currentView, onViewChange }) {
  const { username, role, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try { await logoutUser(); } catch {}
    clearAuth();
    window.location.href = "/login";
  };

  const handleQuickQ = (q) => {
    onViewChange("chat");
    // Emit custom event so ChatView can pick it up
    window.dispatchEvent(new CustomEvent("quick-question", { detail: q }));
  };

  return (
    <aside className="w-56 bg-slate-900 flex flex-col flex-shrink-0 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-white/5">
        <span className="text-2xl">🧠</span>
        <span className="text-white font-bold text-sm tracking-wide">Enterprise AI</span>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-0.5 mt-1">
        {NAV.map(({ id, icon, label }) => (
          <button key={id} onClick={() => onViewChange(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
              ${currentView === id
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}>
            <span className="text-base w-5 text-center">{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      {/* Quick Ask */}
      <div className="mt-3 px-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">Quick Ask</p>
        <div className="space-y-0.5">
          {(QUICK_QUESTIONS[role] || []).map((q) => (
            <button key={q} onClick={() => handleQuickQ(q)}
              className="w-full text-left text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 px-2 py-1.5 rounded transition-colors leading-tight">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* User card */}
      <div className="mt-auto p-3 border-t border-white/5">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            {username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{username}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_BADGE[role] || "bg-slate-700 text-slate-300"}`}>
              {role}
            </span>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="text-slate-500 hover:text-red-400 transition-colors text-base flex-shrink-0">
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}
