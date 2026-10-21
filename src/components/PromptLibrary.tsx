"use client";
import { useRef, useState } from "react";
import { useT } from "./I18n";
import { PROMPT_CATS, promptsFor, type PromptKind } from "@/lib/prompts";

/** A sheet of polished, ready-to-use prompts, grouped by category. */
export default function PromptLibrary({ kind, onPick }: { kind: PromptKind; onPick: (prompt: string) => void }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const dialog = useRef<HTMLDialogElement>(null);
  const cats = PROMPT_CATS[kind];
  const [cat, setCat] = useState(cats[0]?.id);
  const all = promptsFor(kind);
  const activeCat = cats.some((c) => c.id === cat) ? cat : cats[0]?.id;
  const shown = all.filter((x) => x.cat === activeCat);
  const quick = all.slice(0, 4);

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-muted">{ar ? "أفكار احترافية" : "Pro prompts"}</p>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="tap text-xs font-semibold text-cobalt hover:underline underline-offset-2"
        >
          {ar ? `كل الأفكار (${all.length})` : `Browse all ${all.length}`}
        </button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 lg:flex-wrap pb-1">
        {quick.map((x) => (
          <button
            key={x.title.en}
            type="button"
            onClick={() => onPick(x.prompt)}
            className="glass tap shrink-0 rounded-full px-3.5 py-2 text-[13px] text-muted hover:text-ink"
          >
            {x.title[lang]}
          </button>
        ))}
      </div>

      <dialog
        ref={dialog}
        aria-label={ar ? "مكتبة الأفكار" : "Prompt library"}
        className="sheet glass-float glass-solid text-ink p-0 rounded-t-[28px] sm:rounded-[28px] w-full sm:max-w-[620px] max-h-[86vh]"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="flex flex-col max-h-[86vh]">
          <div className="px-5 pt-5 pb-3 border-b border-rule">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{ar ? "مكتبة الأفكار الاحترافية" : "Pro prompt library"}</p>
                <p className="text-sm text-muted mt-0.5">
                  {ar ? "مكتوبة كإرشادات مصوّر محترف. اضغط لاستخدامها ثم عدّل ما تشاء." : "Written like a photographer's brief. Tap one, then tweak anything."}
                </p>
              </div>
              <button type="button" onClick={() => dialog.current?.close()} aria-label={ar ? "إغلاق" : "Close"} className="tap grid place-items-center h-9 w-9 rounded-full border border-rule text-muted shrink-0">
                ✕
              </button>
            </div>
            {cats.length > 1 && (
              <div role="tablist" className="flex gap-2 overflow-x-auto mt-3 -mx-5 px-5 pb-1">
                {cats.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={activeCat === c.id}
                    onClick={() => setCat(c.id)}
                    className={`tap shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border ${activeCat === c.id ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule text-muted"}`}
                  >
                    {c.name[lang]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-2">
            {shown.map((x) => (
              <li key={x.title.en}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(x.prompt);
                    dialog.current?.close();
                  }}
                  className="tap w-full text-start rounded-2xl border border-rule hover:border-cobalt/60 bg-ink/[0.03] px-4 py-3"
                >
                  <span className="block font-semibold">{x.title[lang]}</span>
                  <span className="block text-[13px] text-muted mt-1 line-clamp-3" dir="ltr">
                    {x.prompt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </div>
  );
}
