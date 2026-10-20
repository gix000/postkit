"use client";
import { useEffect, useRef, useState } from "react";
import { CURATED, KIND_TASK, type Kind } from "@/lib/catalog";
import { useT } from "./I18n";

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

export function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m3.5 8.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pick a model by tapping a card. No ids to type. */
export default function ModelChooser({ kind, value, onChange }: { kind: Kind; value: string; onChange: (id: string) => void }) {
  const { lang, t } = useT();
  const curated = CURATED[kind];
  const extra = curated.some((c) => c.id === value) ? null : { id: value, name: prettyName(value), note: `${t.models.by} ${author(value)}` };
  const cards = [
    ...(extra ? [extra] : []),
    ...curated.map((c) => ({ id: c.id, name: c.name, note: c.note[lang] })),
  ];
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p id={`${kind}-model-label`} className="text-sm font-medium">
          {t.models.model}
        </p>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            dialog.current?.showModal();
          }}
          className="text-sm text-cobalt font-medium"
        >
          {t.models.more}
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
              className={`text-start rounded-2xl border px-3.5 py-3 flex items-center gap-3 ${
                on ? "border-cobalt bg-cobalt-soft shadow-[0_0_0_1px_var(--cobalt),0_0_22px_-6px_rgba(187,239,31,0.55)]" : "border-rule bg-surface/60 hover:border-ink/30"
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-semibold leading-tight ltr text-start">{c.name}</span>
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
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="sheet glass-float glass-solid text-ink p-0 rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-[520px] max-h-[82vh]"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        {open && <MoreModels kind={kind} value={value} onPick={onChange} close={() => dialog.current?.close()} />}
      </dialog>
    </div>
  );
}

function MoreModels({ kind, value, onPick, close }: { kind: Kind; value: string; onPick: (id: string) => void; close: () => void }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [models, setModels] = useState<{ id: string; downloads: number }[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(
      async () => {
        try {
          const res = await fetch(`/api/models?task=${KIND_TASK[kind]}${q.trim() ? `&search=${encodeURIComponent(q.trim())}` : ""}`, {
            signal: ctrl.signal,
          });
          const data = (await res.json()) as { models: { id: string; downloads: number }[] };
          setModels(data.models);
          setFailed(false);
        } catch (e) {
          if ((e as Error).name !== "AbortError") setFailed(true);
        }
      },
      q ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [kind, q]);

  return (
    <div className="flex flex-col max-h-[82vh]">
      <div className="px-5 pt-4 pb-3 border-b border-rule">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/20 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{t.models.choose(t.models.kinds[kind])}</h2>
          <button type="button" onClick={close} className="h-9 px-3 rounded-full text-sm text-muted hover:text-ink">
            {t.models.done}
          </button>
        </div>
        <label htmlFor={`${kind}-model-search`} className="sr-only">
          {t.models.search}
        </label>
        <input
          id={`${kind}-model-search`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.models.search}
          className="mt-3 w-full h-11 rounded-full border border-rule bg-paper/60 px-4 focus:outline-none focus:border-cobalt"
        />
      </div>
      <ul className="overflow-y-auto overscroll-contain px-2 py-2" role="listbox" aria-label={t.models.model}>
        {models === null &&
          !failed &&
          Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="px-3 py-3">
              <span className="skel block h-4 w-2/3" />
            </li>
          ))}
        {failed && <li className="px-3 py-6 text-sm text-muted">{t.models.couldntLoad}</li>}
        {models?.length === 0 && <li className="px-3 py-6 text-sm text-muted">{t.models.noMatch}</li>}
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
                className={`w-full text-start rounded-2xl px-3 py-2.5 flex items-center gap-3 ${on ? "bg-cobalt-soft" : "hover:bg-ink/5"}`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate ltr text-start">{prettyName(m.id)}</span>
                  <span className="block text-[12px] text-muted truncate">
                    {t.models.by} <span className="ltr">{author(m.id)}</span> · {compact(m.downloads)} {t.models.downloads}
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
  );
}
