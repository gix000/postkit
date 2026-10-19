"use client";
import { useEffect, useRef, useState } from "react";

export type Kind = "photo" | "video" | "chat";

type Pick = { id: string; name: string; note: string };

/** Hand-picked defaults: plain names and one-word reasons to choose them. */
export const CURATED: Record<Kind, Pick[]> = {
  photo: [
    { id: "black-forest-labs/FLUX.1-schnell", name: "Flux Fast", note: "Quick, sharp, great all-round" },
    { id: "black-forest-labs/FLUX.1-dev", name: "Flux Pro", note: "More detail, a little slower" },
    { id: "stabilityai/stable-diffusion-xl-base-1.0", name: "SDXL", note: "Classic look, art styles" },
  ],
  video: [
    { id: "Wan-AI/Wan2.1-T2V-14B", name: "Wan Cinematic", note: "Smooth, film-like motion" },
    { id: "Lightricks/LTX-Video", name: "LTX Fast", note: "Short clips, quick results" },
    { id: "tencent/HunyuanVideo", name: "Hunyuan", note: "Detailed scenes, slower" },
  ],
  chat: [
    { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama Quick", note: "Fast everyday answers" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen Smart", note: "Deeper reasoning, multilingual" },
    { id: "mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral Light", note: "Short and snappy" },
  ],
};

const TASK: Record<Kind, string> = { photo: "text-to-image", video: "text-to-video", chat: "text-generation" };

/** "black-forest-labs/FLUX.1-schnell" → "FLUX.1 schnell" */
export function prettyName(id: string) {
  const n = id.split("/").pop() ?? id;
  return n.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}
function author(id: string) {
  return id.includes("/") ? id.split("/")[0] : "";
}
function compact(n: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pick a model by tapping a card. No ids to type. */
export default function ModelChooser({ kind, value, onChange }: { kind: Kind; value: string; onChange: (id: string) => void }) {
  const curated = CURATED[kind];
  const extra = curated.some((c) => c.id === value) ? null : { id: value, name: prettyName(value), note: `by ${author(value)}` };
  const cards = extra ? [extra, ...curated] : curated;
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p id={`${kind}-model-label`} className="text-sm font-medium">
          Model
        </p>
        <button type="button" onClick={() => dialog.current?.showModal()} className="text-sm text-cobalt font-medium">
          More models
        </button>
      </div>
      <div role="radiogroup" aria-labelledby={`${kind}-model-label`} className="grid grid-cols-1 gap-2">
        {cards.map((c) => {
          const on = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.id)}
              className={`text-left rounded-2xl border px-3.5 py-3 flex items-center gap-3 ${
                on ? "border-cobalt bg-cobalt-soft shadow-[0_0_0_1px_var(--cobalt),0_0_22px_-6px_rgba(187,239,31,0.55)]" : "border-rule bg-surface/60 hover:border-ink/30"
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-semibold leading-tight">{c.name}</span>
                <span className="block text-[13px] text-muted truncate">{c.note}</span>
              </span>
              <span
                className={`grid place-items-center h-6 w-6 rounded-full shrink-0 ${on ? "bg-cobalt text-cobalt-ink" : "border border-rule text-transparent"}`}
              >
                <Check />
              </span>
            </button>
          );
        })}
      </div>
      <MoreModels kind={kind} dialog={dialog} value={value} onPick={(id) => onChange(id)} />
    </div>
  );
}

function MoreModels({
  kind,
  dialog,
  value,
  onPick,
}: {
  kind: Kind;
  dialog: React.RefObject<HTMLDialogElement | null>;
  value: string;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [models, setModels] = useState<{ id: string; downloads: number }[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/models?task=${TASK[kind]}${q.trim() ? `&search=${encodeURIComponent(q.trim())}` : ""}`, { signal: ctrl.signal });
        const data = (await res.json()) as { models: { id: string; downloads: number }[] };
        setModels(data.models);
        setFailed(false);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setFailed(true);
      }
    }, q ? 250 : 0);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [kind, q]);

  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      className="sheet glass glass-solid text-ink p-0 rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-[520px] max-h-[82vh]"
      onClick={(e) => {
        if (e.target === dialog.current) close();
      }}
    >
      <div className="flex flex-col max-h-[82vh]">
        <div className="px-5 pt-4 pb-3 border-b border-rule">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/20 sm:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Choose a {kind === "chat" ? "chat" : kind} model</h2>
            <button type="button" onClick={close} className="h-9 px-3 rounded-full text-sm text-muted hover:text-ink">
              Done
            </button>
          </div>
          <label htmlFor={`${kind}-model-search`} className="sr-only">
            Search models
          </label>
          <input
            id={`${kind}-model-search`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, like “flux” or “anime”"
            className="mt-3 w-full h-11 rounded-full border border-rule bg-paper/60 px-4 focus:outline-none focus:border-cobalt"
          />
        </div>
        <ul className="overflow-y-auto overscroll-contain px-2 py-2" role="listbox" aria-label="Models">
          {models === null && !failed &&
            Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="px-3 py-3">
                <span className="skel block h-4 w-2/3" />
              </li>
            ))}
          {failed && <li className="px-3 py-6 text-sm text-muted">Couldn&apos;t load models. Close this and try again.</li>}
          {models?.length === 0 && <li className="px-3 py-6 text-sm text-muted">No models match that name.</li>}
          {models?.map((m) => {
            const on = m.id === value;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    onPick(m.id);
                    close();
                  }}
                  className={`w-full text-left rounded-2xl px-3 py-2.5 flex items-center gap-3 ${on ? "bg-cobalt-soft" : "hover:bg-ink/5"}`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium truncate">{prettyName(m.id)}</span>
                    <span className="block text-[12px] text-muted truncate">
                      by {author(m.id)} · {compact(m.downloads)} downloads
                    </span>
                  </span>
                  {on && (
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-cobalt text-cobalt-ink shrink-0">
                      <Check />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
