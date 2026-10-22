import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { askQuestion, getSuggestions, submitFeedback } from "../../api/client";
import { WAKE_MESSAGE } from "../../api/config";
import useAuthStore from "../../store/authStore";
import MessageBubble from "./MessageBubble";

let msgIdCounter = 0;
const nextId = () => ++msgIdCounter;

const WELCOME = {
  id: 0, type: "welcome",
};

export default function ChatView() {
  const { username } = useAuthStore();
  const [messages, setMessages]   = useState([WELCOME]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollDown = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scrollDown(); }, [messages]);

  // Listen for sidebar quick-question and topbar events
  useEffect(() => {
    const onQuick = (e) => { setInput(e.detail); textareaRef.current?.focus(); };
    const onExport = () => exportChat();
    const onClear  = () => clearChat();
    window.addEventListener("quick-question", onQuick);
    window.addEventListener("export-chat",    onExport);
    window.addEventListener("clear-chat",     onClear);
    return () => {
      window.removeEventListener("quick-question", onQuick);
      window.removeEventListener("export-chat",    onExport);
      window.removeEventListener("clear-chat",     onClear);
    };
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const userMsg = { id: nextId(), type: "user", content: q };
    const thinkId = nextId();
    setMessages((m) => [...m.filter((x) => x.type !== "welcome"), userMsg, { id: thinkId, type: "thinking" }]);

    try {
      const { data } = await askQuestion(q);
      const botMsg = {
        id: nextId(), type: "bot",
        content:    data.answer,
        sources:    data.sources    || [],
        confidence: data.confidence || 0,
        timing:     { total: data.total_time_ms, retrieval: data.retrieval_time_ms, llm: data.llm_time_ms },
        queryId:    data.query_id,
        suggestions: [],
      };
      setMessages((m) => [...m.filter((x) => x.id !== thinkId), botMsg]);

      // Fetch suggestions asynchronously (non-blocking)
      getSuggestions(q)
        .then(({ data: sd }) => {
          if (sd.suggestions?.length > 0) {
            setMessages((m) =>
              m.map((msg) => msg.id === botMsg.id ? { ...msg, suggestions: sd.suggestions } : msg)
            );
          }
        })
        .catch(() => {});
    } catch (err) {
      setMessages((m) => m.filter((x) => x.id !== thinkId));
      toast.error(err.response ? "Failed to get an answer. Please try again." : WAKE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleFeedback = useCallback(async (queryId, value, msgId) => {
    try {
      await submitFeedback(queryId, value);
      setMessages((m) =>
        m.map((msg) => msg.id === msgId ? { ...msg, userFeedback: value } : msg)
      );
      toast.success(value === 1 ? "Thanks for the thumbs up!" : "Feedback noted.");
    } catch {
      toast.error("Could not submit feedback.");
    }
  }, []);

  const clearChat = () => {
    if (window.confirm("Clear all messages?")) setMessages([WELCOME]);
  };

  const exportChat = () => {
    const msgs = messages.filter((m) => m.type === "user" || m.type === "bot");
    if (!msgs.length) { toast("No messages to export."); return; }
    let text = `Enterprise AI Chat\n${new Date().toLocaleString()}\nUser: ${username}\n${"=".repeat(50)}\n\n`;
    msgs.forEach((m) => {
      text += `${m.type === "user" ? "You" : "Assistant"}:\n${m.content}\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `chat-${Date.now()}.txt` });
    a.click();
  };

  const fillInput = (text) => { setInput(text); textareaRef.current?.focus(); };

  // Voice
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser. Try Chrome."); return; }
    const r = new SR();
    r.lang = "en-US";
    r.onresult = (e) => setInput(e.results[0][0].transcript);
    r.start();
    toast("Listening… speak now", { icon: "🎤" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            username={username}
            onFeedback={handleFeedback}
            onSuggestionClick={fillInput}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-5 py-3">
        <div className="flex items-end gap-2">
          <button onClick={toggleVoice}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-base flex-shrink-0">
            🎤
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about company policies…"
            rows={1}
            disabled={loading}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition max-h-28 overflow-y-auto"
          />
          <button onClick={send} disabled={loading || !input.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0 h-9">
            {loading ? "…" : "Send ➤"}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-1.5">Enter to send · Shift+Enter for new line · 🎤 voice</p>
      </div>
    </div>
  );
}
