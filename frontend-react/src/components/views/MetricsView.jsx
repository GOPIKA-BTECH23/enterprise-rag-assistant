import { useEffect, useState } from "react";
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getEvalMetrics, getStats } from "../../api/client";

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

function StatCard({ value, label, sub, color = "text-indigo-600" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 text-center shadow-sm">
      <div className={`text-3xl font-extrabold ${color} leading-none`}>{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">{label}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function MetricsView() {
  const [ev, setEv]       = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEvalMetrics(), getStats(30)])
      .then(([{ data: e }, { data: s }]) => { setEv(e); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading metrics…</div>;
  if (!ev)     return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data yet.</div>;

  const confPct     = Math.round((ev.avg_confidence || 0) * 100);
  const answerPct   = Math.round((ev.answer_rate    || 0) * 100);
  const feedbackPct = Math.round((ev.feedback_score || 0) * 100);
  const avgTimeS    = ((ev.avg_response_time_ms || 0) / 1000).toFixed(2);

  const confColor = confPct >= 75 ? "text-emerald-600" : confPct >= 50 ? "text-amber-500" : "text-red-500";

  // Data for charts
  const cdData = [
    { name: "High ≥75%",   value: ev.confidence_distribution?.high   || 0 },
    { name: "Med 50-74%",  value: ev.confidence_distribution?.medium || 0 },
    { name: "Low <50%",    value: ev.confidence_distribution?.low    || 0 },
  ];

  const roleData = Object.entries(ev.queries_by_role || {}).map(([name, value]) => ({ name, value }));

  const topQData = (stats?.top_questions || []).slice(0, 5).map((q) => ({
    name: q.question.length > 28 ? q.question.slice(0, 28) + "…" : q.question,
    count: q.count,
  }));

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-4">Evaluation Metrics &amp; Analytics</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard value={ev.total_queries || 0}           label="Total Queries"    sub="all time" />
        <StatCard value={`${confPct}%`}                   label="Avg Confidence"   sub="retrieval quality" color={confColor} />
        <StatCard value={`${answerPct}%`}                 label="Answer Rate"      sub="questions answered"
          color={answerPct >= 70 ? "text-emerald-600" : "text-amber-500"} />
        <StatCard value={feedbackPct > 0 ? `${feedbackPct}%` : "–"} label="Feedback Score"
          sub={`${ev.thumbs_up || 0}👍 ${ev.thumbs_down || 0}👎`}
          color={feedbackPct >= 70 ? "text-emerald-600" : feedbackPct > 0 ? "text-amber-500" : "text-slate-400"} />
        <StatCard value={`${avgTimeS}s`}                  label="Avg Response"     sub="end-to-end" />
        <StatCard value={stats?.total_users || 0}          label="Active Users"     sub="last 30 days" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Confidence distribution pie */}
        {cdData.some((d) => d.value > 0) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Confidence Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={cdData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {cdData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Queries by role */}
        {roleData.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Queries by Role</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={roleData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top questions */}
      {topQData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Top Questions (30 days)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topQData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trust score explanation */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 text-sm text-indigo-800">
        <p className="font-bold mb-1">📊 How trust metrics work</p>
        <p className="text-xs leading-relaxed text-indigo-700">
          <strong>Confidence</strong> measures how closely retrieved documents match your question (FAISS similarity).
          <strong> Answer Rate</strong> shows what % of questions had a real answer vs "not found".
          <strong> Feedback Score</strong> is based on 👍/👎 ratings from users — the most direct trust signal.
          All metrics persist in the database and improve as more queries are made.
        </p>
      </div>
    </div>
  );
}
