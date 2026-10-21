"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useT } from "./I18n";
import { deleteCreation, setShared } from "@/app/creation-actions";
import Viewer, { type ViewItem } from "./Viewer";
import { useToast } from "./Toast";
import LazyVideo from "./LazyVideo";

export type GridItem = {
  id: string;
  kind: "photo" | "video";
  tool: string;
  url: string;
  prompt: string | null;
  model: string | null;
  is_public: boolean;
  owner?: string | null;
};

function createHref(it: GridItem, mode?: string) {
  const p = new URLSearchParams();
  p.set("mode", mode ?? (it.kind === "video" ? "video" : "photo"));
  if (it.prompt) p.set("prompt", it.prompt);
  if (it.model && (it.tool === "photo" || it.tool === "video")) p.set("model", it.model);
  return `/create?${p}`;
}

/** Masonry-style wall of photos and videos. "mine" adds share and delete controls. */
export default function CreationGrid({ items, mine = false }: { items: GridItem[]; mine?: boolean }) {
  const { t } = useT();
  const [list, setList] = useState(items);
  const [pending, start] = useTransition();
  const [viewing, setViewing] = useState<ViewItem | null>(null);
  const toast = useToast();
  const btn = "tap h-8 px-3 rounded-full text-[12px] font-medium bg-paper/70 backdrop-blur border border-ink/15 hover:border-ink/40";

  return (
    <>
    <ul className="columns-2 md:columns-3 xl:columns-4 gap-3 [column-fill:_balance]">
      {list.map((it) => (
        <li key={it.id} className="rise mb-3 break-inside-avoid rounded-[22px] overflow-hidden border border-rule bg-surface group">
          <button
            type="button"
            onClick={() => setViewing({ url: it.url, kind: it.kind, prompt: it.prompt })}
            aria-label={t.create.view}
            className="relative block w-full overflow-hidden"
          >
            {it.kind === "video" ? (
              <LazyVideo src={it.url} sized className="w-full block bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.url}
                alt={it.prompt ?? ""}
                loading="lazy"
                className="w-full block transition-transform duration-500 group-hover:scale-[1.03] bg-[repeating-conic-gradient(#1c1013_0_25%,#140b0d_0_50%)] bg-[length:20px_20px]"
              />
            )}
            {it.is_public && mine && (
              <span className="absolute top-2 start-2 rounded-full bg-cobalt text-cobalt-ink text-[11px] font-bold px-2 py-0.5">
                {t.create.shared}
              </span>
            )}
          </button>
          <div className="p-2.5 space-y-2">
            {it.prompt && (
              <p className="text-[13px] text-muted line-clamp-2" dir="auto">
                {it.prompt}
              </p>
            )}
            {!mine && it.owner && (
              <p className="text-[12px] text-muted">
                {t.explore.by} <span className="ltr">{it.owner}</span>
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {it.prompt && (
                <Link href={createHref(it)} className={`${btn} inline-flex items-center ${!mine ? "btn-neon border-transparent" : ""}`}>
                  {mine ? t.library.usePrompt : t.explore.usePrompt}
                </Link>
              )}
              {mine && it.kind === "photo" && (
                <Link href={`/create?mode=animate&from=${encodeURIComponent(it.url)}`} className={`${btn} inline-flex items-center`}>
                  {t.create.animate}
                </Link>
              )}
              {mine && (
                <a href={it.url} download className={`${btn} inline-flex items-center`}>
                  {t.create.download}
                </a>
              )}
              {mine && (
                <button
                  type="button"
                  disabled={pending}
                  aria-pressed={it.is_public}
                  onClick={() =>
                    start(async () => {
                      const res = await setShared(it.id, !it.is_public);
                      if (res.ok) {
                        setList((l) => l.map((x) => (x.id === it.id ? { ...x, is_public: !x.is_public } : x)));
                        toast(it.is_public ? t.create.unsharedToast : t.create.sharedToast);
                      }
                    })
                  }
                  className={`${btn} ${it.is_public ? "border-cobalt text-cobalt" : ""}`}
                >
                  {it.is_public ? t.library.unshare : t.library.share}
                </button>
              )}
              {mine && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!window.confirm(t.library.deleteConfirm)) return;
                    start(async () => {
                      const res = await deleteCreation(it.id);
                      if (res.ok) setList((l) => l.filter((x) => x.id !== it.id));
                    });
                  }}
                  className={`${btn} hover:text-danger`}
                >
                  {t.library.delete}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
    <Viewer item={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
