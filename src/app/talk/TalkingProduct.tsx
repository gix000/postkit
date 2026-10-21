"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18n";
import { haptic, useToast } from "@/components/Toast";
import { prepareUpload } from "@/lib/image-client";
import { shareUrl } from "@/lib/share";
import { TALK_COST } from "@/lib/catalog";

const VOICES = [
  { id: "Friendly_Person", en: "Warm", ar: "دافئ" },
  { id: "Casual_Guy", en: "Casual guy", ar: "شاب عفوي" },
  { id: "Deep_Voice_Man", en: "Deep man", ar: "رجل عميق" },
  { id: "Lively_Girl", en: "Lively girl", ar: "فتاة حيوية" },
  { id: "Calm_Woman", en: "Calm woman", ar: "امرأة هادئة" },
  { id: "Wise_Woman", en: "Wise woman", ar: "امرأة رزينة" },
];

function fileToDataUrl(f: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

/** A photo + a typed line (or a voice note) becomes a short video of it talking. */
export default function TalkingProduct() {
  const { lang } = useT();
  const ar = lang === "ar";
  const router = useRouter();
  const toast = useToast();
  const photoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [emotion, setEmotion] = useState("happy");
  const [note, setNote] = useState<{ name: string; data: string } | null>(null);
  const [stage, setStage] = useState<"idle" | "voice" | "video" | "done" | "error">("idle");
  const [job, setJob] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needCredits, setNeedCredits] = useState(false);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (stage !== "voice" && stage !== "video") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [stage]);

  // Check the background video every few seconds.
  useEffect(() => {
    if (!job || stage !== "video") return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/talk?job=${encodeURIComponent(job)}`, { cache: "no-store" });
        const d = await r.json();
        if (!alive) return;
        if (d.status === "done") {
          setResult(d.creation?.url ?? null);
          setStage("done");
          haptic(24);
          toast(ar ? "الفيديو جاهز ✓" : "Your video is ready ✓");
          router.refresh();
          return;
        }
        if (d.status === "failed") {
          setError(d.error);
          setStage("error");
          return;
        }
      } catch {}
      if (alive) setTimeout(tick, 5000);
    };
    const t = setTimeout(tick, 8000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [job, stage, ar, router, toast]);

  async function start() {
    if (!photo || (!text.trim() && !note)) return;
    setError(null);
    setNeedCredits(false);
    setResult(null);
    setStage("voice");
    setStarted(Date.now());
    setNow(Date.now());
    try {
      const r = await fetch("/api/talk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: photo, text, voice, emotion, audio: note?.data }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.job) {
        if (d.code === "insufficient") setNeedCredits(true);
        throw new Error(d.error || "Error");
      }
      setJob(d.job);
      setStage("video");
    } catch (e) {
      setError((e as Error).message);
      setStage("error");
    }
  }

  const secs = started ? Math.max(0, Math.round((now - started) / 1000)) : 0;
  const estSeconds = Math.max(2, Math.round(text.trim().length / 15));
  const busy = stage === "voice" || stage === "video";
  const chip = (on: boolean) => `tap shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border ${on ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule text-muted"}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8 items-start">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium mb-2">1 · {ar ? "صورة بوجه واضح" : "A photo with a clear face"}</p>
          <button type="button" onClick={() => photoInput.current?.click()} className="tap relative w-full aspect-[4/3] rounded-[22px] border border-dashed border-rule overflow-hidden grid place-items-center text-muted text-sm px-6 text-center">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-contain bg-black/40" />
            ) : (
              <span>{ar ? "شخص، شخصية كرتونية، أو منتج بوجه مرسوم. الوجه يجب أن ينظر إلى الكاميرا." : "A person, a cartoon mascot, or a product with a face. The face should look at the camera."}</span>
            )}
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await prepareUpload(f, 1280)); e.target.value = ""; }} />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">2 · {ar ? "ماذا يقول؟" : "What should it say?"}</p>
          {note ? (
            <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-sm">
              <span className="truncate">🎙 {note.name}</span>
              <button type="button" onClick={() => setNote(null)} className="text-muted hover:text-danger shrink-0">{ar ? "إزالة" : "Remove"}</button>
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 220))}
                rows={3}
                dir="auto"
                placeholder={ar ? "أهلا وسهلا! منقوشة الزعتر طازة من الفرن، بس بدولارين. يلّا تعوا!" : "Welcome to Beit Zaatar! Fresh manoushe straight from the oven, only two dollars. Come say hi!"}
                className="w-full rounded-2xl border border-rule bg-surface px-3 py-2.5 text-[16px] focus:outline-none focus:border-cobalt"
              />
              <p className="text-xs text-muted mt-1">
                {text.length}/220 · {ar ? `نحو ${estSeconds} ثوانٍ · يتكلم العربية والإنجليزية` : `about ${estSeconds}s · speaks Arabic and English`}
              </p>
              <div className="flex gap-2 overflow-x-auto mt-2 pb-1">
                {VOICES.map((v) => (
                  <button key={v.id} type="button" className={chip(voice === v.id)} onClick={() => setVoice(v.id)}>{v[lang]}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                {[["happy", "😊", "Happy", "سعيد"], ["neutral", "🙂", "Calm", "هادئ"], ["surprised", "😮", "Excited", "متحمّس"]].map(([id, e, en, a]) => (
                  <button key={id} type="button" className={chip(emotion === id)} onClick={() => setEmotion(id)}>{e} {ar ? a : en}</button>
                ))}
              </div>
            </>
          )}
          {!note && (
            <button type="button" onClick={() => audioInput.current?.click()} className="mt-3 text-sm font-semibold text-cobalt underline underline-offset-2">
              {ar ? "أو استعمل تسجيلًا بصوتك (mp3 أو wav)" : "Or use a recording of your own voice (mp3 or wav)"}
            </button>
          )}
          <input
            ref={audioInput}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > 4_000_000) return toast(ar ? "التسجيل كبير جدًا (الحد 4MB)" : "That recording is too big (4 MB max)", "error");
              setNote({ name: f.name, data: await fileToDataUrl(f) });
            }}
          />
        </div>

        <button type="button" disabled={!photo || (!text.trim() && !note) || busy} onClick={start} className="tap btn-neon w-full h-14 rounded-full text-[16px] font-bold disabled:opacity-50">
          {busy ? (ar ? "نصنع الفيديو…" : "Making your video…") : ar ? `اجعلها تتكلم · ${TALK_COST} رصيد` : `Make it talk · ${TALK_COST} credits`}
        </button>
        {needCredits && (
          <Link href="/credits" className="tap block text-center text-sm font-semibold text-cobalt underline underline-offset-2">
            {ar ? "رصيدك لا يكفي. اشترِ رصيدًا ←" : "Not enough credits. Get credits →"}
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <div className={`relative mx-auto w-full max-w-[360px] aspect-[9/16] rounded-[28px] overflow-hidden ${busy ? "making" : "bg-black"} grid place-items-center`}>
          {result ? (
            <video src={result} autoPlay loop playsInline controls className="absolute inset-0 h-full w-full object-cover" />
          ) : busy ? (
            <div className="relative z-10 text-center px-6">
              <p className="font-bold text-lg">{stage === "voice" ? (ar ? "نسجّل الصوت…" : "Recording the voice…") : ar ? "نحرّك الوجه…" : "Animating the face…"}</p>
              <p className="text-sm text-white/70 mt-1">{ar ? "يستغرق عادةً دقيقتين. يمكنك ترك الصفحة؛ سيُحفظ في مكتبتك." : "Usually about 2 minutes. You can leave; it saves to your Library."}</p>
              <p className="text-2xl font-extrabold tabular-nums mt-3">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</p>
            </div>
          ) : (
            <>
              <video src="/social/talk-demo.mp4" poster="/social/talk-demo.webp" autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-90" />
              <span className="absolute top-3 start-3 rounded-full bg-black/60 text-white text-[11px] font-semibold px-2.5 py-1">{ar ? "مثال حقيقي · بالعربي" : "Real example · in Arabic"}</span>
            </>
          )}
        </div>
        {error && <p className="text-sm text-danger text-center">{error}</p>}
        {result && (
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => shareUrl(result, "postkit-talking.mp4").then((ok) => !ok && window.open(result, "_blank"))} className="tap btn-neon h-11 px-6 rounded-full text-sm font-semibold">{ar ? "انشر" : "Post / share"}</button>
            <a href={result} download="postkit-talking.mp4" className="tap h-11 px-6 rounded-full text-sm font-semibold border border-rule inline-flex items-center">{ar ? "تنزيل" : "Download"}</a>
          </div>
        )}
      </div>
    </div>
  );
}
