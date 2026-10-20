"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "error" };
const Ctx = createContext<(text: string, tone?: "ok" | "error") => void>(() => {});

/** Small glass notes that confirm what just happened ("Saved to your Library"). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const show = useCallback((text: string, tone: "ok" | "error" = "ok") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none bottom-[calc(env(safe-area-inset-bottom)+104px)] md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast glass-float glass-strong rounded-full px-5 py-3 text-sm font-semibold flex items-center gap-2 ${t.tone === "error" ? "text-danger" : "text-ink"}`}
          >
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full ${t.tone === "error" ? "bg-hot shadow-[0_0_10px_#ff0055]" : "bg-cobalt shadow-[0_0_10px_#bbef1f]"}`}
            />
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}

/** A short tap of the phone's vibration motor, where supported. */
export function haptic(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}
