import { useEffect, useState } from "react";
import { getDocumentList, API_BASE } from "../../api/client";

const CHIP = {
  employee: "bg-indigo-100 text-indigo-700",
  hr:       "bg-pink-100   text-pink-700",
  manager:  "bg-green-100  text-green-700",
  admin:    "bg-amber-100  text-amber-700",
};

function encodeDocUrl(docUrl) {
  if (!docUrl) return "";
  const parts = docUrl.replace(/\\/g, "/").split("/");
  return parts.map((p, i) => (i === parts.length - 1 ? encodeURIComponent(p) : p)).join("/");
}

export default function DocumentsView() {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocumentList()
      .then(({ data }) => setDocs(data.documents || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading documents…</div>;

  if (!docs.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="text-4xl mb-3">📁</div>
        <p className="text-sm">No documents found for your role.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-4">Your Documents ({docs.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {docs.map((doc) => {
          const fileUrl = `${API_BASE}/documents/${encodeDocUrl(doc.doc_url)}`;
          return (
            <div key={doc.doc_url} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-indigo-300 flex flex-col gap-3">
              <div className="text-3xl">📄</div>
              <div>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{doc.filename}</p>
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mt-1.5 ${CHIP[doc.role] || "bg-slate-100 text-slate-600"}`}>
                  {doc.role}
                </span>
              </div>
              <div className="flex gap-2 mt-auto">
                <a href={fileUrl} target="_blank" rel="noreferrer"
                  className="flex-1 text-center text-xs font-semibold py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                  👁 View
                </a>
                <a href={fileUrl} download={doc.filename}
                  className="flex-1 text-center text-xs font-semibold py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                  ⬇ Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
