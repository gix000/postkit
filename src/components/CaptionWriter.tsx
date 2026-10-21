"use client";
import { useState } from "react";
import { useT } from "./I18n";
import { haptic, useToast } from "./Toast";

type Caption = { text: string; hashtags: string[] };
const LANGS = [
  { id: "mix", en: "Lebanese mix", ar: "مزيج لبناني" },
  { id: "arabic", en: "عربي لبناني", ar: "عربي لبناني" },
  { id: "arabizi", en: "Arabizi", ar: "عربيزي" },
  { id: "english", en: "English", ar: "إنجليزي" },
  { id: "french", en: "Français", ar: "فرنسي" },
];
const TONES = [
  { id: "fun", en: "Fun", ar: "مرح" },
  { id: "warm", en: "Warm", ar: "دافئ" },
  { id: "luxury", en: "Luxury", ar: "فاخر" },
  { id: "hype", en: "Hype", ar: "حماسي" },
  { id: "pro", en: "Professional", ar: "مهني" },
];
const CTAS = [
  { id: "whatsapp", en: "WhatsApp us", ar: "واتساب" },
  { id: "dm", en: "DM us", ar: "رسالة خاصة" },
  { id: "visit", en: "Visit us", ar: "زورونا" },
  { id: "order", en: "Order now", ar: "اطلب الآن" },
  { id: "bio", en: "Link in bio", ar: "الرابط بالبايو" },
  { id: "none", en: "None", ar: "بدون" },
];
const BIZ = "postkit-business";

function readBiz() {
  try {
    return localStorage.getItem(BIZ) ?? "";
  } catch {
    return "";
  }
}

/** Writes three ready-to-post captions with hashtags, in the voice Lebanese pages actually use. */
export default function CaptionWriter({ initialAbout = "", compact = false }: { initialAbout?: string; compact?: boolean }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const toast = useToast();
  const [about, setAbout] = useState(initialAbout);
  const [business, setBusiness] = useState(readBiz);
  const [offer, setOffer] = useState("");
  const [language, setLanguage] = useState(ar ? "arabic" : "mix");
  const [tone, setTone] = useState("fun");
  const [cta, setCta] = useState("whatsapp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);

  async function write() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(BIZ, business);
    } catch {}
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ about, business, offer, lang: language, tone, cta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.captions) throw new Error(data.error || "Error");
      setCaptions(data.captions);
      haptic(14);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(ar ? "نُسخ ✓" : "Copied ✓");
      haptic(8);
    } catch {
      toast(ar ? "تعذّر النسخ" : "Couldn't copy", "error");
    }
  }

  const field = "w-full rounded-2xl border border-rule bg-surface px-3 py-2.5 text-[16px] focus:outline-none focus:border-cobalt";
  const chip = (on: boolean) => `tap shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border ${on ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule text-muted"}`;
  const row = (label: string, items: { id: string; en: string; ar: string }[], value: string, set: (v: string) => void) => (
    <div>
      <p className="text-xs text-muted mb-1.5">{label}</p>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {items.map((x) => (
          <button key={x.id} type="button" className={chip(value === x.id)} onClick={() => set(x.id)}>
            {x[lang]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={compact ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          write();
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">{ar ? "عن ماذا المنشور؟" : "What's the post about?"}</span>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={3}
            dir="auto"
            required
            placeholder={ar ? "منقوشة زعتر طازة من الفرن للفطور" : "Fresh zaatar manoushe straight from the oven"}
            className={`${field} mt-1`}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder={ar ? "اسم المحل" : "Business name"} dir="auto" className={field} />
          <input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={ar ? "سعر أو عرض (اختياري)" : "Price or offer (optional)"} dir="auto" className={field} />
        </div>
        {row(ar ? "اللغة" : "Language", LANGS, language, setLanguage)}
        {row(ar ? "الأسلوب" : "Tone", TONES, tone, setTone)}
        {row(ar ? "دعوة للتواصل" : "Call to action", CTAS, cta, setCta)}
        <button disabled={busy || about.trim().length < 3} className="tap btn-neon w-full h-12 rounded-full text-[15px] font-semibold disabled:opacity-50">
          {busy ? (ar ? "نكتب…" : "Writing…") : captions.length ? (ar ? "اكتب غيرها" : "Write new ones") : ar ? "اكتب التعليقات · مجانًا" : "Write captions · free"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <div className="space-y-3">
        {busy && !captions.length && [0, 1, 2].map((i) => <div key={i} className="skel h-36 rounded-[22px]" />)}
        {!busy && !captions.length && !compact && (
          <div className="glass rounded-[24px] p-6 text-muted text-sm">
            {ar ? "ستظهر هنا ثلاثة تعليقات مختلفة مع هاشتاغات، جاهزة للنسخ." : "Three different captions with hashtags will show up here, ready to copy."}
          </div>
        )}
        {captions.map((c, i) => {
          const full = `${c.text}\n\n${c.hashtags.join(" ")}`;
          return (
            <div key={i} className="rise glass rounded-[22px] p-4 space-y-3" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="whitespace-pre-line text-[15px] leading-relaxed" dir="auto">{c.text}</p>
              <p className="text-[13px] text-cobalt leading-relaxed" dir="ltr">{c.hashtags.join(" ")}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => copy(full)} className="tap btn-neon h-9 px-4 rounded-full text-[13px] font-semibold">
                  {ar ? "انسخ الكل" : "Copy all"}
                </button>
                <button type="button" onClick={() => copy(c.text)} className="tap h-9 px-4 rounded-full text-[13px] font-semibold border border-rule">
                  {ar ? "النص فقط" : "Text only"}
                </button>
                <button type="button" onClick={() => copy(c.hashtags.join(" "))} className="tap h-9 px-4 rounded-full text-[13px] font-semibold border border-rule">
                  {ar ? "الهاشتاغات" : "Hashtags"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
