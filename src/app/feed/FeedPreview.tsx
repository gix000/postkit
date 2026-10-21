"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18n";
import Logo from "@/components/Logo";
import { haptic } from "@/components/Toast";
import { prepareUpload } from "@/lib/image-client";

type Item = { key: string; url: string; kind: "photo" | "video"; local?: boolean };
const STORE = "postkit-feed-v1";

function readStore(): { order: string[]; hidden: string[]; name: string } {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "{}");
    return { order: v.order ?? [], hidden: v.hidden ?? [], name: v.name ?? "" };
  } catch {
    return { order: [], hidden: [], name: "" };
  }
}

/**
 * A 3-column Instagram-style grid of creations. Tap one tile, then another, to swap them;
 * on a computer you can also drag. The arrangement is remembered on this device.
 */
export default function FeedPreview({ creations, signedIn }: { creations: Item[]; signedIn: boolean }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const [locals, setLocals] = useState<Item[]>([]);
  // Only ever rendered in the browser (see FeedClient), so the saved arrangement can be read up front.
  const [saved] = useState(readStore);
  const [order, setOrder] = useState<string[]>(saved.order);
  const [hidden, setHidden] = useState<string[]>(saved.hidden);
  const [name, setName] = useState(saved.name);
  const [picked, setPicked] = useState<string | null>(null);
  const [shape, setShape] = useState<"portrait" | "square">("portrait");
  const fileInput = useRef<HTMLInputElement>(null);
  const dragKey = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ order, hidden, name }));
    } catch {}
  }, [order, hidden, name]);

  const all = useMemo(() => [...locals, ...creations], [locals, creations]);
  const tiles = useMemo(() => {
    const byKey = new Map(all.map((i) => [i.key, i]));
    const ordered = order.map((k) => byKey.get(k)).filter(Boolean) as Item[];
    const rest = all.filter((i) => !order.includes(i.key));
    return [...rest, ...ordered].filter((i) => !hidden.includes(i.key));
  }, [all, order, hidden]);

  function swap(a: string, b: string) {
    const keys = tiles.map((t) => t.key);
    const ia = keys.indexOf(a), ib = keys.indexOf(b);
    if (ia < 0 || ib < 0) return;
    [keys[ia], keys[ib]] = [keys[ib], keys[ia]];
    setOrder(keys);
    haptic(10);
  }

  const aspect = shape === "portrait" ? "aspect-[3/4]" : "aspect-square";
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
      {/* Phone mock */}
      <div className="mx-auto w-full max-w-[430px] rounded-[40px] border border-rule bg-[#000] p-3 shadow-2xl">
        <div className="rounded-[30px] bg-[#0b0b0b] overflow-hidden">
          <div className="px-4 pt-5 pb-3 flex items-center gap-4">
            <span className="grid place-items-center h-[72px] w-[72px] rounded-full p-[3px] bg-[conic-gradient(#bbef1f,#ff0055,#bbef1f)] shrink-0">
              <span className="grid place-items-center h-full w-full rounded-full bg-[#0b0b0b]">
                <Logo size={30} />
              </span>
            </span>
            <div className="flex-1 grid grid-cols-3 text-center text-white">
              <span><b className="block text-[17px]">{tiles.length}</b><span className="text-[12px] text-white/70">{ar ? "منشور" : "posts"}</span></span>
              <span><b className="block text-[17px]">2.4K</b><span className="text-[12px] text-white/70">{ar ? "متابع" : "followers"}</span></span>
              <span><b className="block text-[17px]">180</b><span className="text-[12px] text-white/70">{ar ? "يتابع" : "following"}</span></span>
            </div>
          </div>
          <div className="px-4 pb-3 text-white">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ar ? "اسم صفحتك" : "Your page name"}
              dir="auto"
              className="w-full bg-transparent font-semibold text-[15px] placeholder:text-white/40 focus:outline-none"
            />
            <p className="text-[13px] text-white/60">{ar ? "معاينة فقط · لا يُنشر شيء" : "Preview only · nothing is posted"}</p>
          </div>
          {tiles.length === 0 ? (
            <div className="px-6 py-16 text-center text-white/70 text-sm">
              {ar ? "لا توجد صور بعد. أضف صورًا من هاتفك أو أنشئ بعضها." : "No photos yet. Add some from your phone or create a few."}
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-[2px]">
              {tiles.map((t) => (
                <li key={t.key} className={`relative ${aspect} bg-[#1a1a1a]`}>
                  <button
                    type="button"
                    draggable
                    onDragStart={() => (dragKey.current = t.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dragKey.current && dragKey.current !== t.key && swap(dragKey.current, t.key)}
                    onClick={() => {
                      if (!picked) setPicked(t.key);
                      else if (picked === t.key) setPicked(null);
                      else {
                        swap(picked, t.key);
                        setPicked(null);
                      }
                    }}
                    aria-label={ar ? "اختر للتبديل" : "Pick to swap"}
                    className={`absolute inset-0 overflow-hidden transition-[transform,opacity] duration-200 ${picked === t.key ? "scale-[0.92] ring-2 ring-[#bbef1f] z-10" : picked ? "opacity-80" : ""}`}
                  >
                    {t.kind === "video" ? (
                      <video src={t.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    )}
                    {t.kind === "video" && <span className="absolute top-1.5 end-1.5 text-white text-xs drop-shadow">▶</span>}
                  </button>
                  {picked === t.key && (
                    <button
                      type="button"
                      onClick={() => {
                        setHidden((h) => [...h, t.key]);
                        setPicked(null);
                      }}
                      className="absolute bottom-1.5 inset-x-1.5 z-20 rounded-full bg-black/75 text-white text-[11px] font-semibold py-1"
                    >
                      {ar ? "إخفاء" : "Hide"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <div className="glass rounded-[24px] p-5 space-y-3">
          <p className="font-bold text-lg">{ar ? "كيف تستعمله" : "How to use it"}</p>
          <ol className="text-sm text-muted space-y-1.5 list-decimal ps-5">
            <li>{ar ? "اضغط صورة ثم صورة أخرى لتبديل مكانيهما." : "Tap a photo, then another, to swap them."}</li>
            <li>{ar ? "أضف صور منشوراتك الحالية لترى الشكل الكامل." : "Add your existing posts to see the full picture."}</li>
            <li>{ar ? "انشر من الأعلى إلى الأسفل بالترتيب الظاهر." : "Post them in order, newest at the top-left."}</li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => fileInput.current?.click()} className="tap btn-neon h-11 px-5 rounded-full text-sm font-semibold">
              {ar ? "+ صور من هاتفي" : "+ Photos from my phone"}
            </button>
            <button
              type="button"
              onClick={() => setShape((s) => (s === "portrait" ? "square" : "portrait"))}
              className="tap h-11 px-5 rounded-full text-sm font-semibold border border-rule"
            >
              {shape === "portrait" ? (ar ? "شبكة مربعة" : "Square grid") : ar ? "شبكة عمودية" : "Portrait grid"}
            </button>
            {(hidden.length > 0 || order.length > 0) && (
              <button
                type="button"
                onClick={() => {
                  setHidden([]);
                  setOrder([]);
                }}
                className="tap h-11 px-5 rounded-full text-sm font-semibold border border-rule text-muted"
              >
                {ar ? "إعادة الضبط" : "Reset"}
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []).slice(0, 18);
              e.target.value = "";
              const urls = await Promise.all(files.map((f) => prepareUpload(f)));
              setLocals((l) => [...urls.map((url, i) => ({ key: `local-${Date.now()}-${i}`, url, kind: "photo" as const, local: true })), ...l]);
            }}
          />
          <p className="text-xs text-muted">{ar ? "الصور التي تضيفها من هاتفك تبقى على جهازك ولا تُرفع." : "Photos you add from your phone stay on your device and aren't uploaded."}</p>
        </div>
        {!signedIn && (
          <div className="glass rounded-[24px] p-5">
            <p className="font-semibold">{ar ? "سجّل الدخول لترى إبداعاتك هنا" : "Sign in to see your creations here"}</p>
            <Link href="/login?next=/feed" className="tap btn-neon mt-3 inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold">
              {ar ? "تسجيل الدخول" : "Sign in"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
