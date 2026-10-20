"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ModelChooser from "@/components/ModelChooser";
import Segmented from "@/components/Segmented";
import Viewer, { type ViewItem } from "@/components/Viewer";
import { haptic, useToast } from "@/components/Toast";
import { useT } from "@/components/I18n";
import {
  CURATED,
  PHOTO_SIZES,
  PRESETS,
  SIZES,
  VIDEO_SIZES,
  costFor,
  type PresetId,
  type SizeId,
  type Tool,
} from "@/lib/catalog";
import { applyMask, prepareUpload, smallCopy, urlToUpload } from "@/lib/image-client";
import { createClient as browserSupabase } from "@/lib/supabase/browser";
import { setShared } from "@/app/creation-actions";

export type Tab = "photo" | "video" | "chat";
type Msg = { role: "user" | "assistant"; content: string };
type Result = { id?: string; url: string; kind: "photo" | "video"; prompt: string; tool: Tool; shared: boolean };

export default function Studio({
  initialTab,
  initialModel,
  initialPrompt,
  initialImage,
  locked,
  credits,
}: {
  initialTab: Tab;
  initialModel?: string;
  initialPrompt?: string;
  initialImage?: string;
  locked: boolean;
  credits: number | null;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [chatModel, setChatModel] = useState(initialTab === "chat" && initialModel ? initialModel : CURATED.chat[0].id);
  const [balance, setBalance] = useState<number | null>(credits);
  // Photo handed from one tab to another ("Animate this").
  const [handoff, setHandoff] = useState<{ tab: Tab; image: string } | null>(initialImage ? { tab: initialTab, image: initialImage } : null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "photo", label: t.create.tabs.photo },
    { id: "video", label: t.create.tabs.video },
    { id: "chat", label: t.create.tabs.chat },
  ];

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-bold tracking-tight leading-none">{t.create.title}</h1>
          <p className="text-muted mt-2 max-w-[60ch]">{t.create.sub}</p>
        </div>
        <Segmented role="tablist" tone="neon" size="lg" label={t.create.title} options={tabs} value={tab} onChange={setTab} className="w-full sm:w-[320px]" />
      </div>

      {locked ? (
        <div className="glass rounded-2xl px-6 py-10">
          <p className="font-semibold text-lg">{t.create.signInTitle}</p>
          <p className="text-sm text-muted mt-1">{t.create.signInBody}</p>
          <Link href="/login?next=/create" className="tap btn-neon mt-5 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
            {t.create.signIn}
          </Link>
        </div>
      ) : tab === "chat" ? (
        <Chat model={chatModel} setModel={setChatModel} />
      ) : (
        <MediaGen
          key={tab}
          kind={tab}
          initialModel={initialTab === tab ? initialModel : undefined}
          initialPrompt={initialPrompt}
          initialImage={handoff?.tab === tab ? handoff.image : undefined}
          balance={balance}
          setBalance={setBalance}
          onHandoff={(to, image) => {
            setHandoff({ tab: to, image });
            setTab(to);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}
    </div>
  );
}

/* ── Photo and video ─────────────────────────────────────── */

function MediaGen({
  kind,
  initialModel,
  initialPrompt,
  initialImage,
  balance,
  setBalance,
  onHandoff,
}: {
  kind: "photo" | "video";
  initialModel?: string;
  initialPrompt?: string;
  initialImage?: string;
  balance: number | null;
  setBalance: (n: number) => void;
  onHandoff: (to: Tab, image: string) => void;
}) {
  const { lang, t } = useT();
  const router = useRouter();
  const isVideo = kind === "video";
  const [source, setSource] = useState<"text" | "photo">(initialImage ? "photo" : "text");
  const remoteStart = Boolean(initialImage && /^https?:/.test(initialImage));
  const [image, setImage] = useState<string | null>(remoteStart ? null : (initialImage ?? null));
  const [loadingImage, setLoadingImage] = useState(remoteStart);
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [size, setSize] = useState<SizeId>(isVideo ? "story" : "square");
  const [preset, setPreset] = useState<PresetId>("none");
  const usesPhoto = source === "photo";
  const pickerKind = isVideo ? (usesPhoto ? "animate" : "video") : usesPhoto ? "edit" : "photo";
  const [models, setModels] = useState<Record<string, string>>(() => ({
    photo: CURATED.photo[0].id,
    edit: CURATED.edit[0].id,
    video: CURATED.video[0].id,
    animate: CURATED.animate[0].id,
    ...(initialModel ? { [pickerKind]: initialModel } : {}),
  }));
  const model = models[pickerKind];
  const tool: Tool = pickerKind as Tool;
  const [items, setItems] = useState<Result[]>([]);
  const [busy, setBusy] = useState<Tool | null>(null);
  const [error, setError] = useState<{ text: string; needCredits?: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [viewing, setViewing] = useState<ViewItem | null>(null);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  // A seconds counter while something is being made.
  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [started]);

  // A photo arriving from a URL (Library "Animate", or a result card).
  useEffect(() => {
    if (initialImage && /^https?:/.test(initialImage)) {
      urlToUpload(initialImage)
        .then(setImage)
        .catch(() => setImage(null))
        .finally(() => setLoadingImage(false));
    }
  }, [initialImage]);

  async function onFile(f: File | undefined | null) {
    if (!f || !f.type.startsWith("image/")) return;
    setLoadingImage(true);
    try {
      setImage(await prepareUpload(f));
      setSource("photo");
    } finally {
      setLoadingImage(false);
    }
  }

  async function run(runTool: Tool) {
    if (busy) return;
    const needsPrompt = runTool === "photo" || runTool === "video" || runTool === "edit";
    if (needsPrompt && !prompt.trim()) {
      setError({ text: lang === "ar" ? "اكتب وصفًا أولًا." : "Describe what you want first." });
      return;
    }
    if (runTool !== "photo" && runTool !== "video" && !image) return;
    setBusy(runTool);
    setError(null);
    setStarted(Date.now());
    setNow(Date.now());
    haptic(8);
    const runModel = runTool === "upscale" || runTool === "cutout" ? undefined : model;
    const runKind: "photo" | "video" = runTool === "video" || runTool === "animate" ? "video" : "photo";
    try {
      const editExtras = runTool === "edit" && image ? await smallCopy(image).catch(() => null) : null;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tool: runTool,
          model: runModel,
          prompt: runTool === "upscale" || runTool === "cutout" ? "" : prompt,
          size,
          preset,
          image: runTool === "photo" || runTool === "video" ? undefined : image,
          imageSmall: editExtras?.small,
          imageWidth: editExtras?.width,
          imageHeight: editExtras?.height,
        }),
      });
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("application/json")) {
        // Saved-file fallback: the server streamed the file back directly.
        const blob = await res.blob();
        const left = Number(res.headers.get("x-credits"));
        if (!Number.isNaN(left)) setBalance(left);
        setItems((prev) => [{ url: URL.createObjectURL(blob), kind: runKind, prompt, tool: runTool, shared: false }, ...prev]);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError({ text: data.error || "Error", needCredits: data.code === "insufficient" });
        return;
      }
      if (typeof data.credits === "number") setBalance(data.credits);
      if (data.mask && image) {
        const png = await applyMask(image, data.mask);
        const saved = await saveCutoutFromBrowser(png);
        setItems((prev) => [
          { id: saved?.id, url: saved?.url ?? URL.createObjectURL(png), kind: "photo", prompt: "", tool: "cutout", shared: false },
          ...prev,
        ]);
      } else if (data.creation) {
        setItems((prev) => [
          { id: data.creation.id, url: data.creation.url, kind: data.creation.kind, prompt, tool: runTool, shared: false },
          ...prev,
        ]);
      }
      toast(t.create.saved);
      haptic(18);
      router.refresh();
    } catch {
      setError({ text: lang === "ar" ? "تعذّر الاتصال. حاول مجددًا." : "Couldn't connect. Try again." });
    } finally {
      setBusy(null);
      setStarted(null);
    }
  }

  const sizes = isVideo ? VIDEO_SIZES : PHOTO_SIZES;
  const showSize = !(usesPhoto && !isVideo);
  const mainLabel = isVideo ? (usesPhoto ? t.create.animatePhoto : t.create.createVideo) : usesPhoto ? t.create.editPhoto : t.create.createPhoto;
  const mainCost = costFor(tool, model);
  const promptLabel = usesPhoto ? (isVideo ? t.create.promptAnimate : t.create.promptEdit) : t.create.promptPhoto;
  const placeholder = usesPhoto
    ? isVideo
      ? t.create.promptAnimatePlaceholder
      : t.create.promptEditPlaceholder
    : isVideo
      ? t.create.promptVideoPlaceholder
      : t.create.promptPhotoPlaceholder;
  const mainDisabled = Boolean(busy) || loadingImage || (usesPhoto && !image) || (!(usesPhoto && isVideo) && !prompt.trim());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(tool);
        }}
      >
        {/* Start from text or a photo */}
        <div>
          <p className="text-sm font-medium mb-2">{t.create.startFrom}</p>
          <Segmented
            label={t.create.startFrom}
            value={source}
            onChange={setSource}
            options={[
              { id: "text", label: t.create.fromPrompt },
              { id: "photo", label: t.create.fromPhoto },
            ]}
          />
        </div>

        {usesPhoto && (
          <div>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
            {image ? (
              <div className="rounded-2xl border border-rule overflow-hidden bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="w-full max-h-72 object-contain bg-[repeating-conic-gradient(#1c1013_0_25%,#140b0d_0_50%)] bg-[length:20px_20px]" />
                <div className="flex items-center justify-between gap-2 p-2">
                  <button type="button" onClick={() => fileInput.current?.click()} className="h-9 px-3 rounded-full text-sm text-muted hover:text-ink">
                    {t.create.replace}
                  </button>
                  <button type="button" onClick={() => setImage(null)} className="h-9 px-3 rounded-full text-sm text-muted hover:text-danger">
                    {t.create.remove}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  onFile(e.dataTransfer.files?.[0]);
                }}
                className="w-full rounded-2xl border-2 border-dashed border-rule hover:border-cobalt bg-surface/50 px-5 py-8 text-center"
              >
                <span className="block font-semibold">{loadingImage ? t.create.working : t.create.upload}</span>
                <span className="block text-sm text-muted mt-1">{t.create.uploadHint}</span>
              </button>
            )}
            {image && !isVideo && (
              <div className="mt-3">
                <p className="text-xs text-muted mb-1.5">{t.create.quickTools}</p>
                <div className="grid grid-cols-2 gap-2">
                  <ToolButton label={t.create.removeBg} cost={costFor("cutout")} busy={busy === "cutout"} disabled={Boolean(busy)} onClick={() => run("cutout")} />
                  <ToolButton label={t.create.upscale} cost={costFor("upscale")} busy={busy === "upscale"} disabled={Boolean(busy)} onClick={() => run("upscale")} />
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor={`${kind}-prompt`} className="text-sm font-medium">
            {promptLabel}
          </label>
          <textarea
            id={`${kind}-prompt`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            dir="auto"
            placeholder={placeholder}
            className="mt-1 w-full rounded-2xl border border-rule bg-surface px-3 py-2.5 text-[15px] focus:outline-none focus:border-cobalt"
          />
          <p className="text-xs text-muted mt-1">{t.create.arabicOk}</p>
          {!prompt.trim() && (
            <div className="mt-3">
              <p className="text-xs text-muted mb-1.5">{t.create.ideas}</p>
              <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap pb-1">
                {t.create.ideaList[pickerKind as "photo" | "edit" | "video" | "animate"].map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    dir="auto"
                    onClick={() => {
                      setPrompt(idea);
                      haptic(6);
                    }}
                    className="glass shrink-0 max-w-[260px] truncate rounded-full px-3.5 py-2 text-[13px] text-muted hover:text-ink"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {showSize && (
          <Chips
            label={t.create.size}
            value={size}
            onChange={(v) => setSize(v as SizeId)}
            options={sizes.map((s) => ({ id: s, label: SIZES[s].label[lang], hint: SIZES[s].ratio }))}
          />
        )}

        <Chips
          label={t.create.style}
          value={preset}
          onChange={(v) => setPreset(v as PresetId)}
          options={PRESETS.map((p) => ({ id: p.id, label: p.label[lang] }))}
          scroll
        />

        <ModelChooser kind={pickerKind} value={model} onChange={(id) => setModels((m) => ({ ...m, [pickerKind]: id }))} />

        <div className="sticky z-30 bottom-[calc(env(safe-area-inset-bottom)+92px)] md:bottom-4 -mx-2 p-2 rounded-full glass-float glass-strong md:static md:m-0 md:p-0 md:bg-transparent md:border-0 md:shadow-none md:backdrop-blur-none">
          <button disabled={mainDisabled} className="tap btn-neon h-12 w-full rounded-full text-[15px] font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
            {busy === tool ? (isVideo ? t.create.makingVideo : t.create.makingPhoto) : mainLabel}
            {busy !== tool && <span className="opacity-70 font-medium">· {t.create.credit(mainCost)}</span>}
          </button>
        </div>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error.text}{" "}
            {error.needCredits && (
              <Link href="/credits" className="underline underline-offset-2 text-cobalt font-semibold">
                {t.create.getCredits}
              </Link>
            )}
          </p>
        )}
        {balance !== null && <p className="text-xs text-muted">{t.create.balance(balance)}</p>}
      </form>

      <div>
        {items.length === 0 && !busy ? (
          <div className="relative overflow-hidden rounded-[28px] border border-rule min-h-[50vh] grid place-items-center px-6 text-center">
            <div className="neon-field opacity-60" aria-hidden="true" />
            <p className="relative z-10 text-muted max-w-[40ch]">{isVideo ? t.create.emptyVideo : t.create.emptyPhoto}</p>
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {busy && (
                <li className="rise rounded-[24px] overflow-hidden border border-rule" role="status">
                  <div
                    className="making grid place-items-center"
                    style={{ aspectRatio: busy === "video" || busy === "animate" ? SIZES[size].ratio.replace(":", " / ") : showSize ? SIZES[size].ratio.replace(":", " / ") : "1 / 1" }}
                  >
                    <div className="relative z-10 text-center px-4">
                      <p className="font-semibold">{isVideo ? t.create.busyVideo : t.create.busyPhoto}</p>
                      <p className="mt-1 text-sm text-ink/70 tabular-nums">{started ? t.create.elapsed(Math.max(0, Math.round((now - started) / 1000))) : ""}</p>
                    </div>
                  </div>
                </li>
              )}
              {items.map((it, i) => (
                <ResultCard
                  key={it.url}
                  item={it}
                  index={i}
                  onView={() => setViewing({ url: it.url, kind: it.kind, prompt: it.prompt })}
                  onShared={(shared) => {
                    setItems((prev) => prev.map((x) => (x.url === it.url ? { ...x, shared } : x)));
                    toast(shared ? t.create.sharedToast : t.create.unsharedToast);
                  }}
                  onEdit={() => {
                    setImage(null);
                    setSource("photo");
                    urlToUpload(it.url).then(setImage).catch(() => null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onAnimate={() => onHandoff("video", it.url)}
                />
              ))}
            </ul>
            {items.length > 0 && (
              <Link href="/library" className="inline-block mt-4 text-sm text-cobalt underline underline-offset-2">
                {t.create.library}
              </Link>
            )}
          </>
        )}
      </div>
      <Viewer item={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function ToolButton({ label, cost, busy, disabled, onClick }: { label: string; cost: number; busy: boolean; disabled: boolean; onClick: () => void }) {
  const { t } = useT();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="glass rounded-2xl px-3 py-2.5 text-start disabled:opacity-50 hover:border-cobalt/60"
    >
      <span className="block text-sm font-semibold">{busy ? t.create.working : label}</span>
      <span className="block text-xs text-muted">{t.create.credit(cost)}</span>
    </button>
  );
}

function Chips({
  label,
  value,
  onChange,
  options,
  scroll = false,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string; hint?: string }[];
  scroll?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className={`flex gap-1.5 ${scroll ? "overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap pb-1" : "flex-wrap"}`}
      >
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] leading-none whitespace-nowrap ${
                on ? "border-cobalt bg-cobalt-soft text-ink font-semibold" : "border-rule bg-surface/60 text-muted hover:text-ink"
              }`}
            >
              {o.label}
              {o.hint && <span className="opacity-60 ltr">{o.hint}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({
  item,
  index,
  onView,
  onShared,
  onEdit,
  onAnimate,
}: {
  item: Result;
  index: number;
  onView: () => void;
  onShared: (shared: boolean) => void;
  onEdit: () => void;
  onAnimate: () => void;
}) {
  const { t } = useT();
  const [pending, start] = useTransition();
  const isVideo = item.kind === "video";
  const action = "tap h-9 px-3 rounded-full text-[13px] font-medium border border-rule hover:border-ink/40";
  return (
    <li className="rise rounded-[24px] border border-rule bg-surface overflow-hidden">
      {isVideo ? (
        <video src={item.url} controls loop playsInline autoPlay muted className="w-full bg-black" />
      ) : (
        <button type="button" onClick={onView} aria-label={t.create.view} className="block w-full group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.prompt}
            className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.02] bg-[repeating-conic-gradient(#1c1013_0_25%,#140b0d_0_50%)] bg-[length:20px_20px]"
          />
        </button>
      )}
      <div className="p-3 space-y-2">
        {item.prompt && <p className="text-sm text-muted line-clamp-2" dir="auto">{item.prompt}</p>}
        <div className="flex flex-wrap gap-1.5">
          <a href={item.url} download={`postkit-${index + 1}.${isVideo ? "mp4" : "png"}`} className={`${action} inline-flex items-center`}>
            {t.create.download}
          </a>
          {!isVideo && (
            <>
              <button type="button" onClick={onEdit} className={action}>
                {t.create.edit}
              </button>
              <button type="button" onClick={onAnimate} className={action}>
                {t.create.animate}
              </button>
            </>
          )}
          {item.id && (
            <button
              type="button"
              disabled={pending}
              aria-pressed={item.shared}
              onClick={() =>
                start(async () => {
                  const res = await setShared(item.id!, !item.shared);
                  if (res.ok) onShared(!item.shared);
                })
              }
              className={`${action} ${item.shared ? "border-cobalt text-cobalt" : ""}`}
            >
              {item.shared ? t.create.shared : t.create.share}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Stores a cutout that was finished in the browser in the visitor's gallery. */
async function saveCutoutFromBrowser(png: Blob): Promise<{ id: string; url: string } | null> {
  const sb = browserSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const id = crypto.randomUUID();
  const path = `${user.id}/${id}.png`;
  const up = await sb.storage.from("creations").upload(path, png, { contentType: "image/png" });
  if (up.error) return null;
  const url = sb.storage.from("creations").getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("creations").insert({ id, user_id: user.id, kind: "photo", tool: "cutout", path, url });
  return error ? null : { id, url };
}

/* ── Chat ────────────────────────────────────────────────── */

function Chat({ model, setModel }: { model: string; setModel: (v: string) => void }) {
  const { t } = useT();
  const [system, setSystem] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          model,
          temperature,
          messages: [...(system.trim() ? [{ role: "system", content: system.trim() }] : []), ...history],
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const payload = l.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              reply += delta;
              setMessages([...history, { role: "assistant", content: reply }]);
            }
          } catch {
            /* partial line */
          }
        }
      }
      if (!reply) setMessages([...history, { role: "assistant", content: t.chat.emptyReply }]);
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError((e as Error).message);
        setMessages(history);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <div className="space-y-5">
        <ModelChooser kind="chat" value={model} onChange={setModel} />
        <div>
          <label htmlFor="system" className="text-sm font-medium">
            {t.chat.system}
          </label>
          <textarea
            id="system"
            value={system}
            dir="auto"
            onChange={(e) => setSystem(e.target.value)}
            rows={3}
            placeholder={t.chat.systemPlaceholder}
            className="mt-1 w-full rounded-2xl border border-rule bg-surface px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
          />
        </div>
        <div>
          <label htmlFor="temp" className="text-sm font-medium flex justify-between">
            {t.chat.temperature} <span className="tabular-nums text-muted">{temperature.toFixed(1)}</span>
          </label>
          <input
            id="temp"
            type="range"
            min={0}
            max={1.5}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full accent-[var(--cobalt)]"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            setMessages([]);
            setError(null);
          }}
          className="text-sm text-muted underline underline-offset-2 hover:text-ink"
        >
          {t.chat.clear}
        </button>
      </div>

      <div className="rounded-2xl border border-rule bg-surface flex flex-col min-h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" aria-live="polite">
          {messages.length === 0 && <p className="text-muted">{t.chat.empty}</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                dir="auto"
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl bg-ink text-paper px-4 py-2.5 whitespace-pre-wrap"
                    : "max-w-[72ch] whitespace-pre-wrap leading-relaxed"
                }
              >
                {m.content || (busy && i === messages.length - 1 ? <span className="text-muted">{t.chat.thinking}</span> : "")}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        {error && <p className="px-4 sm:px-6 pb-2 text-sm text-danger">{error}</p>}
        <form
          className="border-t border-rule p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor="chat-input" className="sr-only">
            {t.chat.message}
          </label>
          <textarea
            id="chat-input"
            value={input}
            dir="auto"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={t.chat.messagePlaceholder}
            className="flex-1 resize-none rounded-2xl border border-rule bg-paper px-3 py-2.5 focus:outline-none focus:border-cobalt"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="tap h-11 px-4 rounded-full border border-rule text-sm font-medium">
              {t.chat.stop}
            </button>
          ) : (
            <button disabled={!input.trim()} className="tap btn-neon h-11 px-5 rounded-full text-sm font-semibold disabled:opacity-40">
              {t.chat.send}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
