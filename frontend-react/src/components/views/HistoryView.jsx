import { useEffect, useState } from "react";
import { getChatHistory } from "../../api/client";

export default function HistoryView() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChatHistory(50)
      .then(({ data }) => setItems(data.history || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading history…</div>;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="text-4xl mb-3">🕐</div>
        <p className="text-sm">No chat history yet. Start asking questions!</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-4">Your Chat History ({items.length})</h2>
      <div className="space-y-3 max-w-2xl">
        {items.map((item) => (
          <div key={item.id}
            onClick={() => window.dispatchEvent(new CustomEvent("quick-question", { detail: item.question }))}
            className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all hover:border-indigo-300 group">
            <p className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors">
              Q: {item.question}
            </p>
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.answer}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                🕐 {item.timestamp ? new Date(item.timestamp).toLocaleString() : "–"}
              </span>
              {item.confidence > 0 && (
                <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">
                  {Math.round(item.confidence * 100)}% confidence
                </span>
              )}
              {item.response_time_ms > 0 && (
                <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  ⏱ {item.response_time_ms}ms
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
