"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { haptic, useToast } from "@/components/Toast";
import { prepareUpload, smallCopy, urlToUpload } from "@/lib/image-client";
import { shareUrl } from "@/lib/share";
import { TEMPLATES } from "@/lib/templates";
import { costFor } from "@/lib/catalog";

type Slot = { state: "idle" | "busy" | "done" | "error"; url?: string; error?: string };
type Caption = { text: string; hashtags: string[] };

const LOOKS = TEMPLATES.filter((t) => t.needs === "photo" && t.mode === "photo" && t.category !== "realestate");
const FEED_MODEL = "runpod/qwen-image-edit-2511";
const STORY_MODEL = "runpod/p-image-edit";
const REEL_MODEL = "runpod/p-video";
export const PACK_COST = costFor("edit", FEED_MODEL) + costFor("edit", STORY_MODEL) + costFor("animate", REEL_MODEL);
const REEL_PROMPT = "Slow cinematic camera push-in around the product, soft light shifting across it, subtle natural motion, premium commercial feel";

async function call(body: Record<string, unknown>) {
  const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.creation?.url) {
    const err = new Error(data.error || "Error") as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return data.creation.url as string;
}

/** One product photo → a matching feed post, story, 5-second reel and caption. */
export default function PostPack({ balance }: { balance: number | null }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [look, setLook] = useState(LOOKS[0].id);
  const [custom, setCustom] = useState("");
  const [business, setBusiness] = useState("");
  const [capLang, setCapLang] = useState(ar ? "arabic" : "mix");
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<Slot>({ state: "idle" });
  const [story, setStory] = useState<Slot>({ state: "idle" });
  const [reel, setReel] = useState<Slot>({ state: "idle" });
  const [caption, setCaption] = useState<{ state: Slot["state"]; items?: Caption[] }>({ state: "idle" });
  const [needCredits, setNeedCredits] = useState(false);

  const chosen = LOOKS.find((l) => l.id === look)!;
  const basePrompt = custom.trim() ? `${custom.trim()}. Keep the product exactly the same. No text.` : chosen.prompt;

  async function make() {
    if (!photo || running) return;
    setRunning(true);
    setNeedCredits(false);
    setFeed({ state: "busy" });
    setStory({ state: "busy" });
    setReel({ state: "busy" });
    setCaption({ state: "busy" });
    const dims = await smallCopy(photo).catch(() => null);
    const common = { tool: "edit", image: photo, imageWidth: dims?.width, imageHeight: dims?.height };
    const fail = (set: (s: Slot) => void) => (e: Error & { code?: string }) => {
      if (e.code === "insufficient") setNeedCredits(true);
      set({ state: "error", error: e.message });
    };

    const feedP = call({ ...common, model: FEED_MODEL, shape: "feed", prompt: basePrompt })
      .then((url) => (setFeed({ state: "done", url }), url))
      .catch((e) => (fail(setFeed)(e), null));
    const storyP = call({ ...common, model: STORY_MODEL, shape: "story", prompt: `${basePrompt} Vertical 9:16 story composition with calm empty space at the top for a headline.` })
      .then((url) => setStory({ state: "done", url }))
      .catch(fail(setStory));
    const captionP = fetch("/api/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ about: custom.trim() || `${chosen.name.en}: ${chosen.blurb.en}`, business, lang: capLang, tone: "fun", cta: "whatsapp" }),
    })
      .then((r) => r.json())
      .then((d) => setCaption(d.captions ? { state: "done", items: d.captions } : { state: "error" }))
      .catch(() => setCaption({ state: "error" }));

    const feedUrl = await feedP;
    if (feedUrl) {
      try {
        const still = await urlToUpload(feedUrl);
        const url = await call({ tool: "animate", model: REEL_MODEL, image: still, prompt: REEL_PROMPT, size: "story" });
        setReel({ state: "done", url });
      } catch (e) {
        fail(setReel)(e as Error);
      }
    } else {
      setReel({ state: "error", error: ar ? "يحتاج الريل إلى صورة المنشور" : "The reel needs the feed post first" });
    }
    await Promise.all([storyP, captionP]);
    setRunning(false);
    haptic(24);
    toast(ar ? "باقتك جاهزة ✓" : "Your pack is ready ✓");
    router.refresh();
  }

  const box = (title: string, ratio: string, slot: Slot, video = false) => (
    <div className="glass rounded-[22px] p-2 flex flex-col gap-2">
      <div className={`relative ${ratio} rounded-[16px] overflow-hidden ${slot.state === "busy" ? "making" : "bg-ink/5"} grid place-items-center`}>
        {slot.url ? (
          video ? (
            <video src={slot.url} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <span className="relative z-10 text-xs text-muted px-3 text-center">
            {slot.state === "busy" ? (ar ? "نصنعه…" : "Making…") : slot.state === "error" ? slot.error : ar ? "بانتظارك" : "Waiting for you"}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <span className="text-sm font-semibold">{title}</span>
        {slot.url && (
          <button type="button" onClick={() => shareUrl(slot.url!, `postkit-${title.toLowerCase()}.${video ? "mp4" : "jpg"}`).then((ok) => !ok && window.open(slot.url, "_blank"))} className="tap h-8 px-3 rounded-full text-[12px] font-semibold btn-neon">
            {ar ? "انشر" : "Post"}
          </button>
        )}
      </div>
    </div>
  );

  const chip = (on: boolean) => `tap shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border ${on ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule text-muted"}`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-8 items-start">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium mb-2">1 · {ar ? "صورة منتجك" : "Your product photo"}</p>
          <button type="button" onClick={() => input.current?.click()} className="tap relative w-full aspect-[4/3] rounded-[22px] border border-dashed border-rule overflow-hidden grid place-items-center text-muted text-sm">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-contain bg-black/40" />
            ) : (
              <span>{ar ? "اضغط لاختيار صورة من الهاتف" : "Tap to pick a phone photo"}</span>
            )}
          </button>
          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await prepareUpload(f)); e.target.value = ""; }} />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">2 · {ar ? "اختر الشكل" : "Pick the look"}</p>
          <div className="grid grid-cols-4 gap-2">
            {LOOKS.map((l) => (
              <button key={l.id} type="button" onClick={() => { setLook(l.id); setCustom(""); }} className={`tap relative aspect-[3/4] rounded-xl overflow-hidden border-2 ${look === l.id && !custom ? "border-cobalt" : "border-transparent"}`} title={l.name[lang]}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.cover} alt={l.name[lang]} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent text-white text-[10px] font-semibold px-1 pb-1 pt-4 leading-tight">{l.name[lang]}</span>
              </button>
            ))}
          </div>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} dir="auto" placeholder={ar ? "أو صِف شكلك الخاص…" : "Or describe your own look…"} className="mt-2 w-full h-11 rounded-xl bg-surface border border-rule px-3 text-[16px] focus:outline-none focus:border-cobalt" />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">3 · {ar ? "للتعليق" : "For the caption"}</p>
          <input value={business} onChange={(e) => setBusiness(e.target.value)} dir="auto" placeholder={ar ? "اسم المحل (اختياري)" : "Business name (optional)"} className="w-full h-11 rounded-xl bg-surface border border-rule px-3 text-[16px] focus:outline-none focus:border-cobalt" />
          <div className="flex gap-2 overflow-x-auto mt-2">
            {[["mix", "Lebanese mix"], ["arabic", "عربي"], ["arabizi", "Arabizi"], ["english", "English"]].map(([id, label]) => (
              <button key={id} type="button" className={chip(capLang === id)} onClick={() => setCapLang(id)}>{label}</button>
            ))}
          </div>
        </div>
        <button type="button" disabled={!photo || running} onClick={make} className="tap btn-neon w-full h-14 rounded-full text-[16px] font-bold disabled:opacity-50">
          {running ? (ar ? "نصنع باقتك…" : "Making your pack…") : ar ? `اصنع الباقة · ${PACK_COST} رصيد` : `Make my pack · ${PACK_COST} credits`}
        </button>
        <p className="text-xs text-muted text-center">
          {balance !== null && (ar ? `رصيدك ${balance}. ` : `You have ${balance} credits. `)}
          {ar ? "منشور + ستوري + ريل + تعليق. أي جزء يفشل يُعاد رصيده تلقائيًا." : "Feed post + story + reel + caption. Anything that fails is refunded automatically."}
        </p>
        {needCredits && (
          <Link href="/credits" className="tap block text-center text-sm font-semibold text-cobalt underline underline-offset-2">
            {ar ? "رصيدك لا يكفي. اشترِ رصيدًا ←" : "Not enough credits. Get credits →"}
          </Link>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 items-start">
          {box(ar ? "منشور" : "Feed", "aspect-[4/5]", feed)}
          {box(ar ? "ستوري" : "Story", "aspect-[9/16]", story)}
          {box(ar ? "ريل" : "Reel", "aspect-[9/16]", reel, true)}
        </div>
        <div className="glass rounded-[22px] p-4">
          <p className="text-sm font-semibold mb-2">{ar ? "التعليق" : "Caption"}</p>
          {caption.state === "busy" && <div className="skel h-24 rounded-xl" />}
          {caption.state === "idle" && <p className="text-sm text-muted">{ar ? "سيظهر التعليق هنا." : "Your caption will show up here."}</p>}
          {caption.state === "error" && <p className="text-sm text-muted">{ar ? "تعذّر كتابة التعليق. جرّب صفحة التعليقات." : "Couldn't write the caption. Try the Captions page."}</p>}
          {caption.items?.slice(0, 2).map((c, i) => (
            <div key={i} className="border-t border-rule first:border-0 py-3 space-y-2">
              <p className="whitespace-pre-line text-[15px]" dir="auto">{c.text}</p>
              <p className="text-[13px] text-cobalt" dir="ltr">{c.hashtags.join(" ")}</p>
              <button type="button" onClick={() => navigator.clipboard.writeText(`${c.text}\n\n${c.hashtags.join(" ")}`).then(() => toast(ar ? "نُسخ ✓" : "Copied ✓"))} className="tap h-9 px-4 rounded-full text-[13px] font-semibold border border-rule">
                {ar ? "انسخ" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
