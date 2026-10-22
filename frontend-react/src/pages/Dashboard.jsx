import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar  from "../components/layout/Topbar";
import ChatView      from "../components/chat/ChatView";
import HistoryView   from "../components/views/HistoryView";
import DocumentsView from "../components/views/DocumentsView";
import MetricsView   from "../components/views/MetricsView";

const VIEWS = {
  chat:      { title: "Chat",      Component: ChatView },
  history:   { title: "History",   Component: HistoryView },
  documents: { title: "Documents", Component: DocumentsView },
  metrics:   { title: "Metrics",   Component: MetricsView },
};

export default function Dashboard() {
  const [view, setView] = useState("chat");
  const { title, Component } = VIEWS[view] || VIEWS.chat;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar currentView={view} onViewChange={setView} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} currentView={view} />
        <main className="flex-1 overflow-hidden">
          <Component />
        </main>
      </div>
    </div>
  );
}
