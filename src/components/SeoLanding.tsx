import Link from "next/link";
import type { Lang } from "@/lib/catalog";
import { SAMPLE_CAPTIONS, SEO_PAGES, seoPage, seoPath, type Media, type SeoPage } from "@/lib/seo-pages";

const SITE = "https://www.postkitlb.com";

function MediaBlock({ media, alt, lang }: { media: Media; alt: string; lang: Lang }) {
  const ar = lang === "ar";
  if (media.kind === "pair") {
    return (
      <figure className="grid grid-cols-2 gap-2.5">
        {[
          [media.before, ar ? "قبل" : "Before"],
          [media.after, ar ? "بعد · PostKit" : "After · PostKit"],
        ].map(([src, label], i) => (
          <div key={src} className={`relative ${media.ratio} overflow-hidden rounded-[22px] border border-rule bg-black`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={i === 1 ? alt : ""} className="absolute inset-0 h-full w-full object-cover" fetchPriority={i === 1 ? "high" : "auto"} />
            <span className={`absolute top-2.5 start-2.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${i === 1 ? "bg-cobalt text-cobalt-ink" : "bg-black/60 text-white"}`}>{label}</span>
          </div>
        ))}
      </figure>
    );
  }
  if (media.kind === "image") {
    return (
      <figure className={`relative ${media.ratio} w-full ${media.ratio.includes("9/16") ? "max-w-[340px]" : "max-w-[500px]"} mx-auto overflow-hidden rounded-[24px] border border-rule bg-black`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.src} alt={alt} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
      </figure>
    );
  }
  if (media.kind === "video") {
    return (
      <figure className={`relative ${media.ratio} w-full max-w-[340px] mx-auto overflow-hidden rounded-[24px] border border-rule bg-black`}>
        <video src={media.src} poster={media.poster} autoPlay muted loop playsInline preload="metadata" aria-label={alt} className="absolute inset-0 h-full w-full object-cover" />
      </figure>
    );
  }
  return (
    <figure aria-label={alt} className="space-y-3">
      {SAMPLE_CAPTIONS.map((c, i) => (
        <div key={i} className="glass rounded-[22px] p-4" dir="ltr">
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{c.text}</p>
          <p className="text-cobalt text-[13px] mt-2">{c.tags}</p>
        </div>
      ))}
    </figure>
  );
}

function jsonLd(p: SeoPage, lang: Lang) {
  const c = p[lang];
  const url = SITE + seoPath(p.slug, lang);
  return [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `PostKit · ${c.h1}`,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web, iOS, Android",
      url,
      inLanguage: lang,
      description: c.description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: lang === "ar" ? "رصيد مجاني للبداية" : "Free credits to start" },
      publisher: { "@type": "Organization", name: "PostKit", url: SITE },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: lang,
      mainEntity: c.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "PostKit", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name: lang === "ar" ? "الأدوات" : "Tools", item: SITE + seoPath(null, lang) },
        { "@type": "ListItem", position: 3, name: c.h1, item: url },
      ],
    },
  ];
}

/** A landing page for one search topic, fully in one language (/use/… English, /ar/use/… Arabic). */
export function SeoLanding({ page, lang }: { page: SeoPage; lang: Lang }) {
  const c = page[lang];
  const ar = lang === "ar";
  const other: Lang = ar ? "en" : "ar";
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(page, lang)).replace(/</g, "\\u003c") }} />

      <section className="relative overflow-hidden border-b border-rule">
        <div className="neon-field opacity-70" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-12 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <nav aria-label={ar ? "مسار التنقل" : "Breadcrumb"} className="text-sm text-muted flex items-center gap-1.5 flex-wrap">
              <Link href="/" className="hover:text-ink">PostKit</Link>
              <span aria-hidden="true">/</span>
              <Link href={seoPath(null, lang)} className="hover:text-ink">{ar ? "الأدوات" : "Tools"}</Link>
              <span aria-hidden="true" className="mx-1">·</span>
              <Link href={seoPath(page.slug, other)} hrefLang={other} lang={other} className="hover:text-ink underline underline-offset-2">
                {ar ? "English" : "العربية"}
              </Link>
            </nav>
            <p className="text-sm font-semibold text-cobalt tracking-wide uppercase mt-6">{c.kicker}</p>
            <h1 className="text-[38px] sm:text-[56px] font-extrabold tracking-[-0.03em] leading-[1.02] mt-2">{c.h1}</h1>
            {c.intro.map((t, i) => (
              <p key={i} className={`text-muted ${i === 0 ? "text-[17px] sm:text-lg mt-4" : "mt-3"} max-w-[58ch] leading-relaxed`}>{t}</p>
            ))}
            <div className="flex flex-wrap gap-3 mt-7">
              <Link href={page.href} prefetch={false} className="tap btn-neon inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold">
                {c.cta} {ar ? "←" : "→"}
              </Link>
              <Link href="/templates" className="tap inline-flex h-12 items-center rounded-full px-5 text-[15px] font-semibold border border-rule hover:border-ink/30">
                {ar ? "كل القوالب" : "All templates"}
              </Link>
            </div>
            <p className="text-sm text-muted mt-4">{ar ? "رصيد مجاني للبداية · بلا بطاقة · بلا اشتراك" : "Free credits to start · No card · No subscription"}</p>
          </div>
          <MediaBlock media={page.media} alt={c.alt} lang={lang} />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
        <h2 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.02em]">{ar ? "كيف يعمل" : "How it works"}</h2>
        <ol className="grid md:grid-cols-3 gap-4 mt-6">
          {c.steps.map(([t, d], i) => (
            <li key={t} className="glass rounded-[24px] p-5">
              <span className="grid place-items-center h-9 w-9 rounded-full bg-cobalt text-cobalt-ink font-bold">{i + 1}</span>
              <h3 className="font-bold text-lg mt-3">{t}</h3>
              <p className="text-muted text-[15px] mt-1.5 leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
        <h2 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.02em]">{ar ? "لماذا PostKit" : "Why PostKit"}</h2>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {c.features.map(([t, d]) => (
            <li key={t} className="rounded-[24px] border border-rule p-5">
              <h3 className="font-bold">{t}</h3>
              <p className="text-muted text-[15px] mt-1.5 leading-relaxed">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[860px] px-4 sm:px-6 pt-14">
        <h2 className="text-[28px] sm:text-[36px] font-extrabold tracking-[-0.02em]">{ar ? "أسئلة شائعة" : "Questions"}</h2>
        <div className="mt-5 divide-y divide-rule border-y border-rule">
          {c.faq.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold text-[17px]">
                <h3>{q}</h3>
                <span aria-hidden="true" className="text-cobalt text-xl transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="text-muted mt-2 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
        <h2 className="text-[24px] sm:text-[30px] font-extrabold tracking-[-0.02em]">{ar ? "أدوات أخرى" : "More tools"}</h2>
        <ul className="grid sm:grid-cols-3 gap-4 mt-5">
          {page.related.map((s) => seoPage(s)).filter(Boolean).map((r) => (
            <li key={r!.slug}>
              <Link href={seoPath(r!.slug, lang)} className="tap block glass rounded-[22px] p-5 h-full hover:border-cobalt/50">
                <span className="block font-bold">{r![lang].h1}</span>
                <span className="block text-muted text-sm mt-1">{r![lang].card}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
        <div className="relative overflow-hidden rounded-[28px] border border-rule p-8 sm:p-12 text-center">
          <div className="neon-field opacity-80" aria-hidden="true" />
          <div className="relative z-10">
            <p className="text-[26px] sm:text-[38px] font-extrabold tracking-[-0.02em] leading-tight">{c.h1}</p>
            <Link href={page.href} prefetch={false} className="tap btn-neon inline-flex h-12 items-center rounded-full px-7 text-[15px] font-semibold mt-6">
              {c.cta} {ar ? "←" : "→"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/** The list of every tool page in one language. */
export function SeoHub({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  const thumb = (m: Media) => (m.kind === "pair" ? m.after : m.kind === "image" ? m.src : m.kind === "video" ? m.poster : null);
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "الأدوات" : "Tools"}</p>
      <h1 className="text-[38px] sm:text-[56px] font-extrabold tracking-[-0.03em] leading-[1.02] mt-1">
        {ar ? "أدوات ذكاء اصطناعي لصفحة محلك" : "AI tools for your business page"}
      </h1>
      <p className="text-muted mt-3 max-w-[60ch]">
        {ar
          ? "إعلانات، منيو، صور منتجات، كابشن لبنانية، فيديوهات وصور تتكلم، بالعربي والإنجليزي. ابدأ برصيد مجاني."
          : "Ads, menus, product photos, Lebanese captions, videos and talking photos, in Arabic and English. Start with free credits."}
        {" "}
        <Link href={seoPath(null, ar ? "en" : "ar")} hrefLang={ar ? "en" : "ar"} className="underline underline-offset-2 hover:text-ink">
          {ar ? "English" : "العربية"}
        </Link>
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
        {SEO_PAGES.map((p) => {
          const t = thumb(p.media);
          return (
            <li key={p.slug}>
              <Link href={seoPath(p.slug, lang)} className="tap group flex gap-4 glass rounded-[22px] p-3 h-full hover:border-cobalt/50">
                <span className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[14px] bg-black">
                  {t ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-cobalt text-2xl font-black">Aa</span>
                  )}
                </span>
                <span className="py-1">
                  <span className="block font-bold leading-snug">{p[lang].h1}</span>
                  <span className="block text-muted text-sm mt-1">{p[lang].card}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
