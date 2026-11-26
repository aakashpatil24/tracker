import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ToastCtx, type Toast, type ToastKind } from "../context/toastCore";
import { Check, X } from "./Icons";

const STYLES: Record<ToastKind, string> = {
  success: "border-emerald-500/40 text-emerald-200",
  error: "border-rose-500/40 text-rose-200",
  info: "border-zinc-700 text-zinc-200",
};

const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback(
    (text: string, kind: ToastKind = "info") => {
      const id = ++nextId.current;
      setToasts((t) => [...t.slice(-2), { id, kind, text }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed z-60 bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 w-[min(92vw,26rem)] pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full flex items-start gap-2 rounded-xl border bg-zinc-900/95 backdrop-blur px-3.5 py-2.5 text-sm shadow-2xl animate-pop-in ${STYLES[t.kind]}`}
          >
            {t.kind === "success" && (
              <Check size={16} className="mt-0.5 shrink-0" />
            )}
            <p className="flex-1 wrap-break-word">{t.text}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="p-0.5 rounded text-zinc-500 hover:text-zinc-200"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export default ToastProvider;
