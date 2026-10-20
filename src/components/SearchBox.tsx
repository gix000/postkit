"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./I18n";

type Hit = { id: string; kind: "model" | "dataset"; href: string; source: "hub" | "community" };

export default function SearchBox({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const listId = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits ?? []);
        setActive(-1);
      } catch {
        /* aborted or offline — keep last results */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(hits.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && hits[active]) go(hits[active].href);
      else if (q.trim()) go(`/models?search=${encodeURIComponent(q.trim())}`);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const visible = q.trim() ? hits : [];
  const models = visible.filter((h) => h.kind === "model");
  const datasets = visible.filter((h) => h.kind === "dataset");
  const showList = open && q.trim().length > 0;

  return (
    <div ref={boxRef} className="relative">
      <label className="sr-only" htmlFor={`${listId}-input`}>
        {t.search.label}
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        placeholder={compact ? t.search.compact : t.search.label}
        className={
          compact
            ? "w-full h-9 rounded-full border border-rule bg-paper/50 px-4 text-sm placeholder:text-muted focus:outline-none focus:border-cobalt"
            : "w-full h-16 rounded-xl border-2 border-ink bg-surface px-5 text-xl placeholder:text-muted focus:outline-none focus:border-cobalt"
        }
      />
      {showList && (
        <div
          id={listId}
          role="listbox"
          className="glass glass-solid absolute inset-x-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
        >
          {visible.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">{loading ? t.search.searching : t.search.none}</p>
          ) : (
            [
              { title: t.search.models, items: models },
              { title: t.search.datasets, items: datasets },
            ].map((g) =>
              g.items.length ? (
                <div key={g.title} className="py-1.5">
                  <p className="px-4 pt-1 pb-1 text-xs font-medium text-muted">{g.title}</p>
                  {g.items.map((h) => {
                    const i = hits.indexOf(h);
                    return (
                      <div
                        key={h.kind + h.id + h.source}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          go(h.href);
                        }}
                        className={`px-4 py-1.5 font-mono text-[13px] cursor-pointer flex items-center justify-between gap-3 ${i === active ? "bg-cobalt-soft" : ""}`}
                      >
                        <span className="truncate ltr">{h.id}</span>
                        {h.source === "community" && <span className="font-sans text-xs text-cobalt shrink-0">{t.search.community}</span>}
                      </div>
                    );
                  })}
                </div>
              ) : null,
            )
          )}
        </div>
      )}
    </div>
  );
}
