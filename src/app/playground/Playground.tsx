"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Mode = "chat" | "image";
type Msg = { role: "user" | "assistant"; content: string };

const CHAT_SUGGESTIONS = ["meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-72B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3"];
const IMAGE_SUGGESTIONS = ["black-forest-labs/FLUX.1-schnell", "stabilityai/stable-diffusion-xl-base-1.0"];

export default function Playground({ initialMode, initialModel, locked }: { initialMode: Mode; initialModel?: string; locked: boolean }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [chatModel, setChatModel] = useState(initialMode === "chat" && initialModel ? initialModel : CHAT_SUGGESTIONS[0]);
  const [imageModel, setImageModel] = useState(initialMode === "image" && initialModel ? initialModel : IMAGE_SUGGESTIONS[0]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight leading-none">Playground</h1>
          <p className="text-muted mt-2 max-w-[60ch]">
            Runs through Hugging Face inference providers. Not every model is served; if one fails, pick another.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-rule bg-surface p-1" role="tablist" aria-label="Playground mode">
          {(["chat", "image"] as Mode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`h-8 px-4 rounded-md text-sm font-medium ${mode === m ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {m === "chat" ? "Chat" : "Image"}
            </button>
          ))}
        </div>
      </div>

      {locked ? (
        <div className="rounded-lg border border-rule bg-surface px-6 py-10">
          <p className="font-medium">Sign in to run models.</p>
          <p className="text-sm text-muted mt-1">Each run uses inference credits, so the playground is for signed-in users.</p>
          <Link
            href="/login?next=/playground"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-ink text-paper px-4 text-sm font-medium"
          >
            Sign in
          </Link>
        </div>
      ) : mode === "chat" ? (
        <Chat model={chatModel} setModel={setChatModel} />
      ) : (
        <ImageGen model={imageModel} setModel={setImageModel} />
      )}
    </div>
  );
}

function ModelPicker({ value, onChange, suggestions, id }: { value: string; onChange: (v: string) => void; suggestions: string[]; id: string }) {
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
        className="mt-1 w-full h-10 rounded-md border border-rule bg-surface px-3 font-mono text-[13px] focus:outline-none focus:border-cobalt"
      />
      <datalist id={`${id}-list`}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="text-xs text-muted mt-1">
        Type any model id, or{" "}
        <Link href="/models?task=text-generation" className="underline underline-offset-2">
          find one in Models
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
        <ModelPicker id="chat-model" value={model} onChange={setModel} suggestions={CHAT_SUGGESTIONS} />
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
            className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
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

      <div className="rounded-lg border border-rule bg-surface flex flex-col min-h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5" aria-live="polite">
          {messages.length === 0 && (
            <p className="text-muted">Send a message to start. Replies stream in as the model writes them.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-lg bg-ink text-paper px-4 py-2.5 whitespace-pre-wrap"
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
            className="flex-1 resize-none rounded-md border border-rule bg-paper px-3 py-2.5 focus:outline-none focus:border-cobalt"
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="h-11 px-4 rounded-md border border-rule text-sm font-medium">
              Stop
            </button>
          ) : (
            <button disabled={!input.trim()} className="h-11 px-4 rounded-md bg-cobalt text-cobalt-ink text-sm font-medium disabled:opacity-40">
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function ImageGen({ model, setModel }: { model: string; setModel: (v: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState<{ src: string; prompt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image generation failed.");
      setImages((prev) => [{ src: data.image, prompt }, ...prev].slice(0, 12));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
      >
        <ModelPicker id="image-model" value={model} onChange={setModel} suggestions={IMAGE_SUGGESTIONS} />
        <div>
          <label htmlFor="prompt" className="text-sm font-medium">
            Prompt
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            placeholder="A ceramic coffee cup on a balcony rail, morning light, Beirut rooftops behind"
            className="mt-1 w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm focus:outline-none focus:border-cobalt"
          />
        </div>
        <button disabled={busy || !prompt.trim()} className="h-10 w-full rounded-md bg-cobalt text-cobalt-ink text-sm font-medium disabled:opacity-40">
          {busy ? "Generating…" : "Generate image"}
        </button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </form>

      <div>
        {images.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rule min-h-[50vh] grid place-items-center text-muted px-6 text-center">
            {busy ? "Generating your first image…" : "Generated images appear here. They aren't stored, so download the ones you want to keep."}
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((img, i) => (
              <li key={i} className="rounded-lg border border-rule bg-surface overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.prompt} className="w-full aspect-square object-cover" />
                <div className="p-3 flex items-start justify-between gap-3">
                  <p className="text-sm text-muted line-clamp-2">{img.prompt}</p>
                  <a href={img.src} download={`postkit-${i + 1}.png`} className="text-sm text-cobalt underline underline-offset-2 shrink-0">
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
