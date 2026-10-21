"use client";
import { useState } from "react";
import Link from "next/link";
import { useT } from "./I18n";
import Segmented from "./Segmented";
import LazyVideo from "./LazyVideo";
import type { ShowCard, ShowTab } from "@/lib/model-showcase";

const TABS: Record<ShowTab, { en: string; ar: string }> = {
  photo: { en: "Photo", ar: "صور" },
  edit: { en: "Edit", ar: "تعديل" },
  video: { en: "Video", ar: "فيديو" },
  tools: { en: "Tools", ar: "أدوات" },
};

function speed(s: number, lang: "en" | "ar") {
  if (s >= 90) return lang === "ar" ? `~${Math.round(s / 60)} د` : `~${Math.round(s / 60)} min`;
  return lang === "ar" ? `~${s} ث` : `~${s} sec`;
}

/** The models people can use, shown as cards with a real result from each one. */
export default function ModelShowcase({ cards }: { cards: ShowCard[] }) {
  const { lang } = useT();
  const tabs = (Object.keys(TABS) as ShowTab[]).filter((k) => cards.some((c) => c.tab === k));
  const [tab, setTab] = useState<ShowTab>(tabs[0] ?? "photo");
  const shown = cards.filter((c) => c.tab === tab);
  const ar = lang === "ar";

  return (
    <section id="models" className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-16 scroll-mt-24">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "النماذج" : "The models"}</p>
          <h2 className="text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">
            {ar ? "الأداة المناسبة لكل فكرة." : "The right engine for every idea."}
          </h2>
          <p className="text-muted mt-2 max-w-[56ch]">
            {ar
              ? "كل نموذج جاهز للاستخدام. اختر حسب ما تصنعه، والسعر بالرصيد مكتوب على كل بطاقة."
              : "Every model is ready to use. Pick by what you're making. The credit price is on every card."}
          </p>
        </div>
        <div>
          <Segmented
            label={ar ? "نوع النموذج" : "Model type"}
            value={tab}
            onChange={setTab}
            role="tablist"
            options={tabs.map((k) => ({ id: k, label: TABS[k][lang] }))}
            className="w-full md:w-[400px]"
          />
        </div>
      </div>

      <ul key={tab} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {shown.map((c, i) => (
          <li key={c.key} className="rise" style={{ animationDelay: `${i * 40}ms` }}>
            <Link
              href={c.href}
              className="tap group relative block overflow-hidden rounded-[24px] glass p-1.5 hover:border-cobalt/50 transition-colors"
            >
              <span className="relative block overflow-hidden rounded-[19px] aspect-[3/4] bg-black">
                {c.video ? (
<LazyVideo src={c.video} poster={c.media} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.media}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" aria-hidden="true" />
                {c.badge && (
                  <span className="absolute top-2.5 start-2.5 rounded-full bg-black/55 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-white border border-white/15">
                    {c.badge[lang]}
                  </span>
                )}
                {c.before && (
                  <span className="absolute top-2.5 end-2.5 flex items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.before} alt="" loading="lazy" decoding="async" className="h-12 w-9 rounded-md object-cover border border-white/40 shadow-lg" />
                    <span className="text-white text-xs font-bold drop-shadow">{ar ? "←" : "→"}</span>
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block text-white font-bold text-[17px] leading-tight">{c.name}</span>
                  <span className="block text-white/75 text-[12.5px] leading-snug mt-0.5 line-clamp-2">{c.bestFor[lang]}</span>
                </span>
              </span>
              <span className="flex items-center justify-between gap-2 px-2 pt-2 pb-1 text-[12.5px]">
                <span className="inline-flex items-center gap-1 font-semibold text-cobalt">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M13.2 3 5 13.5h6l-1 7.5 8-10.5h-6z" />
                  </svg>
                  {c.credits} {ar ? "رصيد" : c.credits === 1 ? "credit" : "credits"}
                </span>
                <span className="text-muted tabular-nums">{speed(c.seconds, lang)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
