"use client";
import { useEffect, useRef, useState } from "react";
import { useT } from "./I18n";
import { haptic, useToast } from "./Toast";
import { makeBeforeAfterReel, reelSupported } from "@/lib/reel";
import { downloadBlob, saveFromBrowser } from "@/lib/save-client";
import { shareBlob } from "@/lib/share";

/** Records a Before/After swipe reel in the browser and lets people save, download or post it. */
export default function ReelMaker({ before, after, onClose }: { before: string; after: string; onClose: () => void }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [progress, setProgress] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const supported = reelSupported();

  useEffect(() => {
    dialog.current?.showModal();
    if (!supported) return;
    let alive = true;
    makeBeforeAfterReel(before, after, {
      before: ar ? "قبل" : "BEFORE",
      after: ar ? "بعد" : "AFTER",
      onProgress: (p) => alive && setProgress(p),
    })
      .then((b) => {
        if (!alive) return;
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        haptic(18);
      })
      .catch(() => alive && setError(ar ? "تعذّر صنع الفيديو على هذا المتصفح." : "Couldn't make the video in this browser."));
    return () => {
      alive = false;
    };
  }, [before, after, ar, supported]);

  const ext = blob?.type.includes("mp4") ? "mp4" : "webm";
  const btn = "tap h-11 px-5 rounded-full text-[15px] font-semibold";
  return (
    <dialog ref={dialog} onClose={onClose} className="sheet glass-solid text-ink p-0 rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-[440px] max-h-[92vh]" aria-label="Before/After reel">
      <div className="p-5 space-y-4 overflow-y-auto max-h-[92vh] overscroll-contain">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{ar ? "ريل قبل/بعد" : "Before/After reel"}</p>
            <p className="text-sm text-muted">{ar ? "فيديو 9:16 جاهز للريلز والتيك توك والستوري." : "A 9:16 clip ready for Reels, TikTok and Stories."}</p>
          </div>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={ar ? "إغلاق" : "Close"} className="tap grid place-items-center h-9 w-9 rounded-full border border-rule text-muted shrink-0">
            ✕
          </button>
        </div>
        <div className="mx-auto w-[220px] aspect-[9/16] rounded-2xl overflow-hidden bg-black grid place-items-center">
          {url ? (
            <video src={url} autoPlay loop muted playsInline controls className="h-full w-full object-cover" />
          ) : error || !supported ? (
            <p className="text-sm text-muted p-4 text-center">{error ?? (ar ? "متصفحك لا يدعم تسجيل الفيديو. جرّب Chrome أو Safari الحديث." : "Your browser can't record video. Try a recent Chrome or Safari.")}</p>
          ) : (
            <div className="w-3/4 text-center">
              <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                <div className="h-full bg-cobalt transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <p className="text-xs text-muted mt-2">{ar ? "نصنع الفيديو…" : "Making your reel…"}</p>
            </div>
          )}
        </div>
        {blob && (
          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className={`${btn} btn-neon`} onClick={() => shareBlob(blob, `postkit-before-after.${ext}`).then((ok) => !ok && downloadBlob(blob, `postkit-before-after.${ext}`))}>
              {ar ? "انشر" : "Post / share"}
            </button>
            <button type="button" className={`${btn} border border-rule`} onClick={() => downloadBlob(blob, `postkit-before-after.${ext}`)}>
              {ar ? "تنزيل" : "Download"}
            </button>
            <button
              type="button"
              disabled={saved}
              className={`${btn} border border-rule disabled:opacity-50`}
              onClick={async () => {
                const r = await saveFromBrowser(blob, { kind: "video", tool: "reel", prompt: "Before / After" });
                setSaved(Boolean(r));
                toast(r ? (ar ? "حُفظ في مكتبتك" : "Saved to your Library") : ar ? "تعذّر الحفظ" : "Couldn't save", r ? "ok" : "error");
              }}
            >
              {saved ? (ar ? "محفوظ" : "Saved") : ar ? "احفظ في المكتبة" : "Save to Library"}
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
}
