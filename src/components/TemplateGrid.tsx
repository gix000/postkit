"use client";
import { useState } from "react";
import Link from "next/link";
import { useT } from "./I18n";
import LazyVideo from "./LazyVideo";
import { costFor, type Tool } from "@/lib/catalog";
import { CATEGORIES, templateHref, type Template, type TemplateCategory } from "@/lib/templates";

function toolFor(t: Template): Tool {
  if (t.mode === "video") return t.needs === "photo" ? "animate" : "video";
  return t.needs === "photo" ? "edit" : "photo";
}

export function TemplateCard({ t, i = 0 }: { t: Template; i?: number }) {
  const { lang } = useT();
  const ar = lang === "ar";
  const credits = costFor(toolFor(t), t.model);
  return (
    <Link
      href={templateHref(t)}
      className="tap group relative block overflow-hidden rounded-[24px] glass p-1.5 hover:border-cobalt/50 transition-colors rise"
      style={{ animationDelay: `${i * 35}ms` }}
    >
      <span className="relative block overflow-hidden rounded-[19px] aspect-[3/4] bg-black">
        {t.video ? (
          <LazyVideo src={t.video} poster={t.cover} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" aria-hidden="true" />
        <span className="hidden sm:block absolute top-2.5 start-2.5 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white border border-white/15">
          {t.needs === "photo" ? (ar ? "ارفع صورتك" : "Upload your photo") : ar ? "غيّر الكلمات" : "Edit the words"}
        </span>
        {t.before && (
          <span className="absolute top-2.5 end-2.5 flex flex-col items-center gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.before} alt="" className="h-14 w-[42px] rounded-lg object-cover border border-white/50 shadow-lg" />
            <span className="rounded-full bg-black/60 px-1.5 text-[10px] font-semibold text-white">{ar ? "قبل" : "Before"}</span>
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 p-3">
          <span className="block text-white font-bold text-[17px] leading-tight">{t.name[lang]}</span>
          <span className="block text-white/75 text-[12.5px] leading-snug mt-0.5 line-clamp-2">{t.blurb[lang]}</span>
        </span>
      </span>
      <span className="flex items-center justify-between gap-2 px-2 pt-2 pb-1 text-[12.5px]">
        <span className="inline-flex items-center gap-1 font-semibold text-cobalt">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13.2 3 5 13.5h6l-1 7.5 8-10.5h-6z" />
          </svg>
          {credits} {ar ? "رصيد" : credits === 1 ? "credit" : "credits"}
        </span>
        <span className="font-medium text-ink/80 group-hover:text-ink">{ar ? "استخدم ←" : "Use →"}</span>
      </span>
    </Link>
  );
}

/** All templates with category chips. */
export default function TemplateGrid({ templates }: { templates: Template[] }) {
  const { lang } = useT();
  const [cat, setCat] = useState<TemplateCategory | "all">("all");
  const shown = cat === "all" ? templates : templates.filter((t) => t.category === cat);
  const chips: { id: TemplateCategory | "all"; label: string }[] = [
    { id: "all", label: lang === "ar" ? "الكل" : "All" },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.name[lang] })),
  ];
  return (
    <div>
      <div role="tablist" aria-label={lang === "ar" ? "الفئات" : "Categories"} className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 mb-5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={cat === c.id}
            onClick={() => setCat(c.id)}
            className={`tap shrink-0 h-10 px-4 rounded-full text-sm font-semibold border transition-colors ${cat === c.id ? "bg-cobalt text-cobalt-ink border-transparent" : "border-rule text-muted hover:text-ink hover:border-ink/30"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <ul key={cat} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {shown.map((t, i) => (
          <li key={t.id}>
            <TemplateCard t={t} i={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}
