"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type Mode = "photo" | "video" | "chat";
type Msg = { role: "user" | "assistant"; content: string };

const CHAT_SUGGESTIONS = ["meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-72B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3"];
const PHOTO_SUGGESTIONS = ["black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.1-dev", "stabilityai/stable-diffusion-xl-base-1.0"];
const VIDEO_SUGGESTIONS = ["Wan-AI/Wan2.1-T2V-14B", "Lightricks/LTX-Video", "tencent/HunyuanVideo"];

const MODES: { id: Mode; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "video", label: "Video" },
  { id: "chat", label: "Chat" },
];

export default function Studio({
  initialMode,
  initialModel,
  initialPrompt,
  locked,
}: {
  initialMode: Mode;
  initialModel?: string;
  initialPrompt?: string;
  locked: boolean;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [chatModel, setChatModel] = useState(initialMode === "chat" && initialModel ? initialModel : CHAT_SUGGESTIONS[0]);
  const [photoModel, setPhotoModel] = useState(initialMode === "photo" && initialModel ? initialModel : PHOTO_SUGGESTIONS[0]);
  const [videoModel, setVideoModel] = useState(initialMode === "video" && initialModel ? initialModel : VIDEO_SUGGESTIONS[0]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-bold tracking-tight leading-none">Create</h1>
          <p className="text-muted mt-2 max-w-[60ch]">Describe what you want and pick a model. If a model is busy or unavailable, try another one.</p>
        </div>
        <div className="glass flex gap-1 rounded-full p-1" role="tablist" aria-label="What to create">
          {MODES.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`h-9 px-5 rounded-full text-sm font-semibold ${mode === m.id ? "btn-neon" : "text-muted hover:text-ink"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {locked ? (
        <div className="glass rounded-2xl px-6 py-10">
          <p className="font-semibold text-lg">Sign in to create.</p>
          <p className="text-sm text-muted mt-1">It&apos;s free. Every photo and video uses AI credits, so creating is for signed-in members.</p>
          <Link href="/login?next=/create" className="tap btn-neon mt-5 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
            Sign in
          </Link>
        </div>
      ) : mode === "chat" ? (
        <Chat model={chatModel} setModel={setChatModel} />
      ) : mode === "photo" ? (
        <MediaGen key="photo" kind="photo" model={photoModel} setModel={setPhotoModel} initialPrompt={initialPrompt} />
      ) : (
        <MediaGen key="video" kind="video" model={videoModel} setModel={setVideoModel} initialPrompt={initialPrompt} />
      )}
    </div>
  );
}

function ModelPicker({ value, onChange, suggestions, id, browseHref }: { value: string; onChange: (v: string) => void; suggestions: string[]; id: string; browseHref: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        Model
      </label>
      <input
        id={id}
        list={`${id}-list`}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        spellCheck={false}
        className="tap mt-1 w-full h-10 rounded-full border border-rule bg-surface px-3 font-mono text-[13px] focus:outline-none focus:border-cobalt"
      />
      <datalist id={`${id}-list`}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="text-xs text-muted mt-1">
        Type any model id, or{" "}
        <Link href={browseHref} className="underline underline-offset-2">
          browse models
        </Link>
        .
      </p>
    </div>
  );
}

function Chat({ model, setModel }: { model: string; setModel: (v: string) => void }) {
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
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
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
      if (!reply) setMessages([...history, { role: "assistant", content: "(The model returned an empty reply.)" }]);
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
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      <div className="space-y-5">
        <ModelPicker id="chat-model" value={model} onChange={setModel} suggestions={CHAT_SUGGESTIONS} browseHref="/models?task=text-generation" />
        <div>
          <label htmlFor="system" className="text-sm font-medium">
            System prompt
          </label>
          <textarea
            id="system"
            value={system}
            onChange={(e) => setSystem(e.target.value)}
            rows={4}
            placeholder="Optional. e.g. Answer in Lebanese Arabic."
            className="mt-1 w-full rounded-xl border border-rule bg-surface px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
          />
        </div>
        <div>
          <label htmlFor="temp" className="text-sm font-medium flex justify-between">
            Temperature <span className="tabular-nums text-muted">{temperature.toFixed(1)}</span>
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
          onClick={() => {
            abortRef.current?.abort();
            setMessages([]);
            setError(null);
          }}
          className="text-sm text-muted underline underline-offset-2 hover:text-ink"
        >
          Clear conversation
        </button>
      </div>

      <div className="rounded-2xl border border-rule bg-surface flex flex-col min-h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" aria-live="polite">
          {messages.length === 0 && (
            <p className="text-muted">Send a message to start. Replies stream in as the model writes them.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl bg-ink text-paper px-4 py-2.5 whitespace-pre-wrap"
                    : "max-w-[72ch] whitespace-pre-wrap leading-relaxed"
                }
              >
                {m.content || (busy && i === messages.length - 1 ? <span className="text-muted">Thinking…</span> : "")}
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
            Message
          </label>
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Message the model"
            className="flex-1 resize-none rounded-xl border border-rule bg-paper px-3 py-2.5 focus:outline-none focus:border-cobalt"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="tap h-11 px-4 rounded-full border border-rule text-sm font-medium">
              Stop
            </button>
          ) : (
            <button disabled={!input.trim()} className="tap btn-neon h-11 px-4 rounded-full text-sm font-semibold disabled:opacity-40">
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function MediaGen({
  kind,
  model,
  setModel,
  initialPrompt,
}: {
  kind: "photo" | "video";
  model: string;
  setModel: (v: string) => void;
  initialPrompt?: string;
}) {
  const [prompt, setPrompt] = useState(initialPrompt ?? "");
  const [items, setItems] = useState<{ src: string; prompt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVideo = kind === "video";

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(isVideo ? "/api/video" : "/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });
      const type = res.headers.get("content-type") ?? "";
      let src: string;
      if (type.startsWith("video/")) {
        src = URL.createObjectURL(await res.blob());
      } else {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed.");
        src = isVideo ? data.video : data.image;
      }
      setItems((prev) => [{ src, prompt }, ...prev].slice(0, 12));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
      >
        <div>
          <label htmlFor={`${kind}-prompt`} className="text-sm font-medium">
            Prompt
          </label>
          <textarea
            id={`${kind}-prompt`}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder={
              isVideo
                ? "Slow pan across Beirut rooftops at golden hour, pigeons taking off"
                : "A ceramic coffee cup on a balcony rail, morning light, Beirut rooftops behind"
            }
            className="mt-1 w-full rounded-xl border border-rule bg-surface px-3 py-2.5 text-[15px] focus:outline-none focus:border-cobalt"
          />
        </div>
        <ModelPicker
          id={`${kind}-model`}
          value={model}
          onChange={setModel}
          suggestions={isVideo ? VIDEO_SUGGESTIONS : PHOTO_SUGGESTIONS}
          browseHref={isVideo ? "/models?task=text-to-video" : "/models?task=text-to-image"}
        />
        <button disabled={busy || !prompt.trim()} className="tap btn-neon h-12 w-full rounded-full text-[15px] font-semibold disabled:opacity-40">
          {busy ? (isVideo ? "Making your video… this can take a few minutes" : "Making your photo…") : isVideo ? "Create video" : "Create photo"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <div>
        {items.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-rule min-h-[50vh] grid place-items-center px-6 text-center">
            <div className="neon-field opacity-60" aria-hidden="true" />
            <p className="relative z-10 text-muted max-w-[40ch]">
              {busy
                ? isVideo
                  ? "Your video is rendering. Keep this tab open."
                  : "Your photo is on its way…"
                : isVideo
                  ? "Your videos appear here. Download the ones you want to keep."
                  : "Your photos appear here. They aren't saved, so download the ones you want to keep."}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((it, i) => (
              <li key={it.src} className="rounded-2xl border border-rule bg-surface overflow-hidden">
                {isVideo ? (
                  <video src={it.src} controls loop playsInline className="w-full aspect-video bg-black" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.src} alt={it.prompt} className="w-full aspect-square object-cover" />
                )}
                <div className="p-3 flex items-start justify-between gap-3">
                  <p className="text-sm text-muted line-clamp-2">{it.prompt}</p>
                  <a
                    href={it.src}
                    download={`postkit-${i + 1}.${isVideo ? "mp4" : "png"}`}
                    className="text-sm text-cobalt underline underline-offset-2 shrink-0"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
