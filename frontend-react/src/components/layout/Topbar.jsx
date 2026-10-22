export default function Topbar({ title, currentView }) {
  const isChat = currentView === "chat";

  const exportChat = () => window.dispatchEvent(new CustomEvent("export-chat"));
  const clearChat  = () => window.dispatchEvent(new CustomEvent("clear-chat"));

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 shadow-sm">
      <h1 className="text-base font-bold text-slate-800">{title}</h1>
      {isChat && (
        <div className="flex gap-2">
          <button onClick={exportChat}
            className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            ⬇ Export
          </button>
          <button onClick={clearChat}
            className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            🗑 Clear
          </button>
        </div>
      )}
    </header>
  );
}
