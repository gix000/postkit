"use client";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useT } from "@/components/I18n";
import { haptic, useToast } from "@/components/Toast";
import { prepareUpload } from "@/lib/image-client";
import { downloadBlob, saveFromBrowser } from "@/lib/save-client";
import { shareBlob } from "@/lib/share";
import { TEMPLATES } from "@/lib/templates";

type Item = { id: string; photo?: string; name: string; nameAr: string; desc: string; price: string };
type Theme = "neon" | "cream" | "street";
type Format = "post" | "story" | "print";
type Menu = { title: string; tagline: string; contact: string; currency: string; theme: Theme; format: Format; items: Item[] };

const STORE = "postkit-menu-v1";
const FORMATS: Record<Format, { w: number; h: number; label: { en: string; ar: string } }> = {
  post: { w: 1080, h: 1350, label: { en: "Instagram post", ar: "منشور إنستغرام" } },
  story: { w: 1080, h: 1920, label: { en: "Story", ar: "ستوري" } },
  print: { w: 1240, h: 1754, label: { en: "A4 print", ar: "طباعة A4" } },
};
const THEMES: Record<Theme, { label: { en: string; ar: string }; bg: string; ink: string; muted: string; accent: string; card: string; title: string }> = {
  neon: { label: { en: "Neon night", ar: "نيون ليلي" }, bg: "radial-gradient(120% 60% at 100% 0%, #2b3a06 0%, #0d0303 55%), #0d0303", ink: "#eff8ff", muted: "rgba(239,248,255,.62)", accent: "#bbef1f", card: "rgba(255,255,255,.06)", title: "#bbef1f" },
  cream: { label: { en: "Café cream", ar: "كريمي للمقاهي" }, bg: "#f4ede2", ink: "#2a1d12", muted: "#7b6a58", accent: "#b5562a", card: "#fffaf2", title: "#2a1d12" },
  street: { label: { en: "Street bold", ar: "جريء للشارع" }, bg: "#111", ink: "#fff", muted: "rgba(255,255,255,.6)", accent: "#ffd400", card: "#1c1c1c", title: "#ffd400" },
};
const uid = () => Math.random().toString(36).slice(2, 9);
const SAMPLE: Menu = {
  title: "Beit Zaatar",
  tagline: "Fresh from the oven · Beirut",
  contact: "WhatsApp 70 000 000",
  currency: "$",
  theme: "neon",
  format: "post",
  items: [
    { id: uid(), name: "Zaatar Manoushe", nameAr: "منقوشة زعتر", desc: "Thyme, sesame, olive oil", price: "2" },
    { id: uid(), name: "Cheese Manoushe", nameAr: "منقوشة جبنة", desc: "Akkawi & mozzarella", price: "3.5" },
    { id: uid(), name: "Lahm Bi Ajeen", nameAr: "لحم بعجين", desc: "Spiced meat, tomato", price: "4" },
    { id: uid(), name: "Fresh Lemonade", nameAr: "ليموناضة", desc: "With mint", price: "2" },
  ],
};

function readStore(): Menu {
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "null");
    return v && Array.isArray(v.items) ? v : SAMPLE;
  } catch {
    return SAMPLE;
  }
}

/** The menu itself, drawn at its real export size. */
function Sheet({ m, sheetRef }: { m: Menu; sheetRef?: React.Ref<HTMLDivElement> }) {
  const th = THEMES[m.theme];
  const f = FORMATS[m.format];
  const withPhotos = m.items.some((i) => i.photo);
  const cols = 2;
  return (
    <div
      ref={sheetRef}
      style={{ width: f.w, height: f.h, background: th.bg, color: th.ink, fontFamily: "var(--font-sans)" }}
      className="relative overflow-hidden flex flex-col"
    >
      <div style={{ padding: "84px 84px 40px" }}>
        <p style={{ fontSize: 26, letterSpacing: "0.3em", textTransform: "uppercase", color: th.accent, fontWeight: 700 }}>Menu · القائمة</p>
        <h1 style={{ fontSize: m.format === "story" ? 120 : 104, lineHeight: 0.95, fontWeight: 800, letterSpacing: "-0.04em", color: th.title, marginTop: 18 }}>{m.title || " "}</h1>
        {m.tagline && <p style={{ fontSize: 32, color: th.muted, marginTop: 18 }}>{m.tagline}</p>}
      </div>
      <div
        style={{
          padding: "0 84px",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: withPhotos ? 28 : "8px 56px",
          alignContent: "start",
          flex: 1,
        }}
      >
        {m.items.map((it) =>
          withPhotos ? (
            <div key={it.id} style={{ background: th.card, borderRadius: 28, overflow: "hidden" }}>
              {it.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.photo} alt="" style={{ width: "100%", aspectRatio: m.format === "post" ? "16/10" : "4/3", objectFit: "cover", display: "block" }} />
              ) : null}
              <div style={{ padding: "18px 22px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{it.name}</span>
                  <span style={{ fontSize: 32, fontWeight: 800, color: th.accent, whiteSpace: "nowrap" }}>{it.price && `${m.currency}${it.price}`}</span>
                </div>
                {it.nameAr && <p dir="rtl" style={{ fontSize: 30, fontFamily: "var(--font-naskh), serif", fontWeight: 700, marginTop: 4, textAlign: "right" }}>{it.nameAr}</p>}
                {it.desc && <p style={{ fontSize: 22, color: th.muted, marginTop: 4 }}>{it.desc}</p>}
              </div>
            </div>
          ) : (
            <div key={it.id} style={{ padding: "22px 0", borderBottom: `2px dashed ${th.muted}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 36, fontWeight: 800 }}>{it.name}</span>
                <span style={{ fontSize: 36, fontWeight: 800, color: th.accent }}>{it.price && `${m.currency}${it.price}`}</span>
              </div>
              {it.nameAr && <p dir="rtl" style={{ fontSize: 32, fontFamily: "var(--font-naskh), serif", fontWeight: 700, textAlign: "right" }}>{it.nameAr}</p>}
              {it.desc && <p style={{ fontSize: 24, color: th.muted }}>{it.desc}</p>}
            </div>
          ),
        )}
      </div>
      {m.contact && (
        <div style={{ padding: "28px 84px 64px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: th.muted }}>
          <span>{m.contact}</span>
          <span style={{ fontSize: 22, opacity: 0.7 }}>Made with PostKit</span>
        </div>
      )}
    </div>
  );
}

const MENU_PROMPT = TEMPLATES.find((t) => t.id === "menu-dish")!.prompt;

export default function MenuMaker({ signedIn }: { signedIn: boolean }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const toast = useToast();
  const [m, setM] = useState<Menu>(readStore);
  const [busy, setBusy] = useState(false);
  const [proBusy, setProBusy] = useState<string | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const f = FORMATS[m.format];

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(m));
    } catch {}
  }, [m]);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (box.current?.clientWidth ?? 360) / f.w));
    fit();
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [f.w]);

  const set = (patch: Partial<Menu>) => setM((x) => ({ ...x, ...patch }));
  const setItem = (id: string, patch: Partial<Item>) => setM((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  async function makePro(it: Item) {
    if (!it.photo || proBusy) return;
    setProBusy(it.id);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool: "edit", model: "runpod/qwen-image-edit-2511", prompt: MENU_PROMPT, image: it.photo, imageWidth: 1024, imageHeight: 1024 }),
      });
      const data = await res.json();
      if (!res.ok || !data.creation?.url) throw new Error(data.error || "Error");
      const blob = await (await fetch(data.creation.url)).blob();
      const url = await new Promise<string>((r) => {
        const fr = new FileReader();
        fr.onload = () => r(String(fr.result));
        fr.readAsDataURL(blob);
      });
      setItem(it.id, { photo: url });
      toast(ar ? "صارت الصورة احترافية" : "Photo upgraded");
      haptic(18);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setProBusy(null);
    }
  }

  async function exportPng(): Promise<Blob> {
    const node = sheet.current!;
    const url = await toPng(node, { width: f.w, height: f.h, pixelRatio: 1, cacheBust: true, style: { transform: "none" } });
    return await (await fetch(url)).blob();
  }
  async function finish(mode: "download" | "share" | "save") {
    setBusy(true);
    try {
      const blob = await exportPng();
      const name = `${(m.title || "menu").replace(/\W+/g, "-").toLowerCase()}-menu.png`;
      if (mode === "download") downloadBlob(blob, name);
      if (mode === "share" && !(await shareBlob(blob, name))) downloadBlob(blob, name);
      if (mode === "save" || signedIn) {
        const r = await saveFromBrowser(blob, { kind: "photo", tool: "menu", prompt: `${m.title} menu` });
        if (mode === "save") toast(r ? (ar ? "حُفظت في مكتبتك" : "Saved to your Library") : ar ? "سجّل الدخول للحفظ" : "Sign in to save", r ? "ok" : "error");
      }
      haptic(18);
    } catch {
      toast(ar ? "تعذّر التصدير. حاول مجددًا." : "Couldn't export. Try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full h-11 rounded-xl bg-surface border border-rule px-3 text-[16px] focus:outline-none focus:border-cobalt";
  const chip = (on: boolean) => `tap h-9 px-3.5 rounded-full text-[13px] font-semibold border ${on ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule text-muted"}`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start">
      <div className="space-y-5">
        <div className="glass rounded-[24px] p-5 space-y-3">
          <input className={field} value={m.title} onChange={(e) => set({ title: e.target.value })} placeholder={ar ? "اسم المطعم" : "Restaurant name"} dir="auto" />
          <input className={field} value={m.tagline} onChange={(e) => set({ tagline: e.target.value })} placeholder={ar ? "سطر قصير" : "Short tagline"} dir="auto" />
          <div className="grid grid-cols-[1fr_90px] gap-2">
            <input className={field} value={m.contact} onChange={(e) => set({ contact: e.target.value })} placeholder={ar ? "واتساب أو عنوان" : "WhatsApp or address"} dir="auto" />
            <select className={field} value={m.currency} onChange={(e) => set({ currency: e.target.value })} aria-label="Currency">
              <option value="$">$</option>
              <option value="LBP ">LBP</option>
              <option value="€">€</option>
              <option value="">—</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(THEMES) as Theme[]).map((k) => (
              <button key={k} type="button" className={chip(m.theme === k)} onClick={() => set({ theme: k })}>{THEMES[k].label[lang]}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMATS) as Format[]).map((k) => (
              <button key={k} type="button" className={chip(m.format === k)} onClick={() => set({ format: k })}>{FORMATS[k].label[lang]}</button>
            ))}
          </div>
        </div>

        <ul className="space-y-3">
          {m.items.map((it, i) => (
            <li key={it.id} className="glass rounded-[22px] p-4 space-y-2">
              <div className="flex items-center gap-3">
                <label className="tap relative grid place-items-center h-16 w-16 shrink-0 rounded-xl border border-dashed border-rule overflow-hidden cursor-pointer text-muted text-xs text-center">
                  {it.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span>{ar ? "+ صورة" : "+ Photo"}</span>
                  )}
                  <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setItem(it.id, { photo: await prepareUpload(f) }); e.target.value = ""; }} />
                </label>
                <div className="flex-1 grid grid-cols-[1fr_80px] gap-2">
                  <input className={field} value={it.name} onChange={(e) => setItem(it.id, { name: e.target.value })} placeholder={ar ? "الاسم بالإنجليزية" : "Name"} />
                  <input className={field} value={it.price} onChange={(e) => setItem(it.id, { price: e.target.value })} placeholder={ar ? "السعر" : "Price"} inputMode="decimal" />
                </div>
              </div>
              <input className={field} value={it.nameAr} onChange={(e) => setItem(it.id, { nameAr: e.target.value })} placeholder="الاسم بالعربية" dir="rtl" />
              <input className={field} value={it.desc} onChange={(e) => setItem(it.id, { desc: e.target.value })} placeholder={ar ? "وصف قصير (اختياري)" : "Short description (optional)"} dir="auto" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {it.photo && signedIn && (
                  <button type="button" disabled={Boolean(proBusy)} onClick={() => makePro(it)} className="tap h-9 px-3.5 rounded-full text-[13px] font-semibold border border-cobalt/50 text-cobalt disabled:opacity-50">
                    {proBusy === it.id ? (ar ? "نحسّن الصورة…" : "Upgrading…") : ar ? "✦ صورة احترافية · 3 رصيد" : "✦ Make photo pro · 3 credits"}
                  </button>
                )}
                {it.photo && <button type="button" onClick={() => setItem(it.id, { photo: undefined })} className="text-muted hover:text-ink">{ar ? "إزالة الصورة" : "Remove photo"}</button>}
                <button type="button" onClick={() => setM((x) => ({ ...x, items: x.items.filter((y) => y.id !== it.id) }))} className="ms-auto text-muted hover:text-danger">{ar ? "حذف" : "Delete"}</button>
                {i > 0 && (
                  <button type="button" aria-label="Move up" onClick={() => setM((x) => { const a = [...x.items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return { ...x, items: a }; })} className="text-muted hover:text-ink">↑</button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setM((x) => ({ ...x, items: [...x.items, { id: uid(), name: "", nameAr: "", desc: "", price: "" }] }))}
          className="tap w-full h-12 rounded-full border border-dashed border-rule text-sm font-semibold text-muted hover:text-ink"
        >
          {ar ? "+ أضف صنفًا" : "+ Add item"}
        </button>
      </div>

      <div className="lg:sticky lg:top-24 space-y-4">
        <div ref={box} className="w-full max-w-[640px] mx-auto">
          <div className="rounded-[20px] overflow-hidden shadow-2xl border border-rule" style={{ width: f.w * scale, height: f.h * scale }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: f.w, height: f.h }}>
              <Sheet m={m} sheetRef={sheet} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button type="button" disabled={busy} onClick={() => finish("share")} className="tap btn-neon h-12 px-6 rounded-full text-[15px] font-semibold disabled:opacity-50">
            {busy ? (ar ? "نجهّز…" : "Preparing…") : ar ? "انشر" : "Post / share"}
          </button>
          <button type="button" disabled={busy} onClick={() => finish("download")} className="tap h-12 px-6 rounded-full text-[15px] font-semibold border border-rule disabled:opacity-50">
            {ar ? "تنزيل PNG" : "Download PNG"}
          </button>
          {m.format === "print" && (
            <button type="button" onClick={() => window.print()} className="tap h-12 px-6 rounded-full text-[15px] font-semibold border border-rule">
              {ar ? "طباعة" : "Print"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
