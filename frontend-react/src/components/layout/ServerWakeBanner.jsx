import { useEffect } from "react";
import useServerStore from "../../store/serverStore";
import { WAKE_MESSAGE } from "../../api/config";

export default function ServerWakeBanner() {
  const { status, wakeServer } = useServerStore();

  useEffect(() => { wakeServer(); }, [wakeServer]);

  if (status === "waking") {
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-amber-100 border-b border-amber-300 text-amber-900 text-sm px-4 py-2 flex items-center justify-center gap-2 shadow">
        <span className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        {WAKE_MESSAGE}
      </div>
    );
  }

  if (status === "down") {
    return (
      <div className="fixed top-0 inset-x-0 z-50 bg-red-100 border-b border-red-300 text-red-800 text-sm px-4 py-2 flex items-center justify-center gap-3 shadow">
        Can't reach the server right now.
        <button onClick={wakeServer} className="font-semibold underline">Try again</button>
      </div>
    );
  }

  return null;
}
