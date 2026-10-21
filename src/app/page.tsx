import Link from "next/link";
import HeroPrompt from "@/components/HeroPrompt";
import Logo from "@/components/Logo";
import { listPublic } from "@/lib/creations";
import { getT } from "@/lib/i18n/server";
import { SHOWCASE, showcaseHref } from "@/lib/showcase";
import ModelShowcase from "@/components/ModelShowcase";
import LazyVideo from "@/components/LazyVideo";
import { showcaseCards } from "@/lib/model-showcase";
import { TrustBar, HowItWorks, Faq, FinalCta } from "@/components/HomeSections";
import { TemplateCard } from "@/components/TemplateGrid";
import { TEMPLATES } from "@/lib/templates";

export default async function Home() {
  const [{ lang, t }, showcase] = await Promise.all([getT(), listPublic(undefined, 8)]);
  const ar = lang === "ar";
  const featured = ["menu-dish", "burger-ad", "white-studio", "luxury-podium", "bright-listing", "staging", "photo-video", "event-poster"]
    .map((id) => TEMPLATES.find((x) => x.id === id)!)
    .filter(Boolean);

  const featureLinks = ["/create?mode=photo", "/create?mode=animate", "/create?mode=photo"];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="neon-field" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 sm:pt-16 pb-14 sm:pb-20 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-12 items-center">
          <div>
            <Link href="/create" className="tap glass inline-flex items-center gap-2 rounded-full ps-1.5 pe-4 py-1.5 text-sm">
              <Logo size={22} />
              <span className="font-medium">{t.home.badge}</span>
            </Link>
            <h1 className="mt-7 text-[52px] sm:text-[84px] lg:text-[96px] font-extrabold leading-[0.9] tracking-[-0.045em] max-w-[11ch]">
              {t.home.title}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted max-w-[46ch]">{t.home.sub}</p>
            <div className="mt-9 max-w-[680px]">
              <HeroPrompt />
            </div>
          </div>

          {/* Real photos made with PostKit's Flux 2 models. Tap one to use its prompt. */}
          <div className="relative">
            <ul className="flex lg:grid lg:grid-cols-2 gap-3 overflow-x-auto snap-x -mx-4 px-4 lg:mx-0 lg:px-0 pb-1 lg:[transform:rotate(-2deg)]">
              {SHOWCASE.slice(0, 4).map((s, i) => (
                <li key={s.src} className={`snap-start shrink-0 w-[46vw] sm:w-[34vw] lg:w-auto ${i % 2 === 1 ? "lg:translate-y-10" : ""}`}>
                  <Link href={showcaseHref(s.prompt)} className="tap group block rounded-[26px] overflow-hidden glass p-1.5">
                    <span className="block overflow-hidden rounded-[20px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.src}
                        width={s.w}
                        height={s.h}
                        alt={s.prompt}
                        loading={i < 2 ? "eager" : "lazy"}
                        fetchPriority={i === 0 ? "high" : "auto"}
                        decoding="async"
                        className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <ul className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {t.home.features.map((f, i) => (
              <li key={f.title}>
                <Link href={featureLinks[i]} className="tap glass block rounded-[22px] p-4 h-full hover:border-cobalt/50">
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm text-muted mt-1">{f.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <TrustBar lang={lang} />

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "القوالب" : "Templates"}</p>
            <h2 className="text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1 max-w-[22ch]">
              {ar ? "صور احترافية لعملك، بنقرة واحدة." : "Pro shots for your business, in one tap."}
            </h2>
            <p className="text-muted mt-2 max-w-[56ch]">
              {ar ? "ارفع صورة من هاتفك واختر الشكل. كل نتيجة هنا صُنعت فعلًا بهذا القالب." : "Upload a phone photo and pick a look. Every result here was really made with that template."}
            </p>
          </div>
          <Link href="/templates" className="tap inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold border border-rule hover:border-ink/40 shrink-0 self-start sm:self-auto">
            {ar ? "كل القوالب ←" : "All templates →"}
          </Link>
        </div>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {featured.map((tp, i) => (
            <li key={tp.id}>
              <TemplateCard t={tp} i={i} />
            </li>
          ))}
        </ul>
      </section>

      <div className="cv"><HowItWorks lang={lang} /></div>

      <div className="cv"><ModelShowcase cards={showcaseCards()} /></div>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-2xl font-bold tracking-tight">{t.home.fromExplore}</h2>
          <Link href="/explore" className="text-sm text-cobalt underline underline-offset-2">
            {t.home.exploreAll}
          </Link>
        </div>
        <ul className="flex gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 snap-x">
          {[
            ...showcase.map((c) => ({
              key: c.id,
              src: c.url,
              video: c.kind === "video",
              prompt: c.prompt ?? "",
              href: `/create?mode=${c.kind}${c.prompt ? `&prompt=${encodeURIComponent(c.prompt)}` : ""}`,
            })),
            ...SHOWCASE.slice(4).map((s) => ({ key: s.src, src: s.src, video: false, prompt: s.prompt, href: showcaseHref(s.prompt) })),
          ].map((c) => (
            <li key={c.key} className="snap-start shrink-0 w-[220px] sm:w-[260px]">
              <Link href={c.href} className="tap group block rounded-[22px] overflow-hidden glass p-1.5">
                <span className="block overflow-hidden rounded-[17px]">
                  {c.video ? (
                    <LazyVideo src={c.src} className="w-full aspect-[3/4] object-cover bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.src} alt={c.prompt} loading="lazy" decoding="async" className="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  )}
                </span>
                {c.prompt && (
                  <span className="block px-2 pt-2 pb-1 text-[13px] text-muted line-clamp-2" dir="auto">
                    {c.prompt}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="cv"><Faq lang={lang} /></div>
      <div className="cv"><FinalCta lang={lang} /></div>
    </div>
  );
}

