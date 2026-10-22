import { useState } from "react";
import { API_BASE } from "../../api/client";

function encodeDocUrl(docUrl) {
  if (!docUrl) return "";
  const parts = docUrl.replace(/\\/g, "/").split("/");
  return parts.map((p, i) => (i === parts.length - 1 ? encodeURIComponent(p) : p)).join("/");
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.75 ? "bg-emerald-500" : value >= 0.5 ? "bg-amber-400" : "bg-red-400";
  const textColor = value >= 0.75 ? "text-emerald-600" : value >= 0.5 ? "text-amber-600" : "text-red-500";
  return (
    <div className="mt-2.5 pt-2.5 border-t border-slate-100">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Confidence</span>
        <span className={`font-bold ${textColor}`}>{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SourceCard({ src }) {
  const fileUrl = src.doc_url ? `${API_BASE}/documents/${encodeDocUrl(src.doc_url)}` : null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <span className="text-indigo-600 font-semibold text-xs">📄 {src.filename}</span>
          <span className="text-slate-400 text-xs ml-2">Page {src.page + 1}</span>
        </div>
        {fileUrl && (
          <div className="flex gap-1.5">
            <a href={fileUrl} target="_blank" rel="noreferrer"
              className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors">
              View
            </a>
            <a href={fileUrl} download={src.filename}
              className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors">
              Download
            </a>
          </div>
        )}
      </div>
      <p className="text-slate-500 text-xs mt-1.5 italic leading-relaxed line-clamp-2">{src.snippet}</p>
    </div>
  );
}

export default function MessageBubble({ msg, username, onFeedback, onSuggestionClick }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  if (msg.type === "welcome") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10 animate-fade-up">
        <div className="text-5xl mb-4">🧠</div>
        <h3 className="text-xl font-bold text-slate-700 mb-2">How can I help you today?</h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          Ask me anything about your company policies. I'll only answer from your authorised documents.
        </p>
      </div>
    );
  }

  if (msg.type === "thinking") {
    return (
      <div className="flex items-start gap-2 animate-fade-up">
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1">
            {[0, 0.2, 0.4].map((d) => (
              <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce-dot" style={{ animationDelay: `${d}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === "user") {
    return (
      <div className="flex items-start gap-2 flex-row-reverse animate-fade-up">
        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {username?.charAt(0).toUpperCase()}
        </div>
        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[70%] shadow-sm text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  // Bot message
  const { content, sources = [], confidence = 0, timing, queryId, userFeedback, suggestions = [] } = msg;

  return (
    <div className="flex items-start gap-2 animate-fade-up">
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">🤖</div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[72%] shadow-sm">
        {/* Answer */}
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{content}</p>

        {/* Confidence */}
        {confidence > 0 && <ConfidenceBar value={confidence} />}

        {/* Timing */}
        {timing?.total && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">⏱ {(timing.total / 1000).toFixed(2)}s</span>
            {timing.retrieval && <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🔍 {timing.retrieval}ms</span>}
            {timing.llm       && <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">🤖 {timing.llm}ms</span>}
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setSourcesOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors w-full">
              <span>📎</span>
              <span>{sources.length} source{sources.length > 1 ? "s" : ""}</span>
              <span className="ml-auto">{sourcesOpen ? "▲" : "▼"}</span>
            </button>
            {sourcesOpen && (
              <div className="mt-2 space-y-2">
                {sources.map((src, i) => <SourceCard key={i} src={src} />)}
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {queryId && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">Was this helpful?</span>
            <button onClick={() => onFeedback(queryId, 1, msg.id)} disabled={!!userFeedback}
              className={`text-sm px-2.5 py-0.5 rounded-full border transition-all ${userFeedback === 1 ? "bg-emerald-100 border-emerald-400" : "border-slate-200 hover:border-emerald-400 hover:bg-emerald-50"}`}>
              👍
            </button>
            <button onClick={() => onFeedback(queryId, -1, msg.id)} disabled={!!userFeedback}
              className={`text-sm px-2.5 py-0.5 rounded-full border transition-all ${userFeedback === -1 ? "bg-red-100 border-red-400" : "border-slate-200 hover:border-red-400 hover:bg-red-50"}`}>
              👎
            </button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dashed border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">💡 You might also ask</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => onSuggestionClick(s)}
                  className="text-xs px-3 py-1 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-indigo-600 rounded-full transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
