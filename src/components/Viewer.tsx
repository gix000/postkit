"use client";
import { useEffect, useRef } from "react";
import { useT } from "./I18n";

export type ViewItem = { url: string; kind: "photo" | "video"; prompt?: string | null };

/** Full-screen view of a photo or video. Pinch to zoom on phones; tap outside or press Esc to close. */
export default function Viewer({ item, onClose }: { item: ViewItem | null; onClose: () => void }) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (item && !d.open) d.showModal();
    if (!item && d.open) d.close();
  }, [item]);

  return (
    <dialog
      ref={ref}
      className="viewer"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {item && (
        <div className="h-full w-full flex flex-col" onClick={(e) => e.target === e.currentTarget && onClose()}>
          <div className="flex items-center justify-end gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
            <a href={item.url} download className="tap glass-float glass-strong h-10 px-4 inline-flex items-center rounded-full text-sm font-semibold">
              {t.create.download}
            </a>
            <button type="button" onClick={onClose} aria-label="Close" className="tap glass-float glass-strong h-10 w-10 grid place-items-center rounded-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="flex-1 min-h-0 grid place-items-center px-3 overflow-auto" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {item.kind === "video" ? (
              <video src={item.url} controls autoPlay loop playsInline className="max-h-full max-w-full rounded-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.prompt ?? ""} className="max-h-full max-w-full rounded-2xl object-contain [touch-action:pinch-zoom]" />
            )}
          </div>
          {item.prompt && (
            <p dir="auto" className="mx-auto max-w-[72ch] px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))] text-sm text-muted text-center line-clamp-3">
              {item.prompt}
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
