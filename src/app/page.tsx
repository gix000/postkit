import Link from "next/link";
import HeroPrompt from "@/components/HeroPrompt";
import RepoRow from "@/components/RepoRow";
import Logo from "@/components/Logo";
import { listModels } from "@/lib/hf";
import { listPublic } from "@/lib/creations";
import { getT } from "@/lib/i18n/server";
import { SHOWCASE, showcaseHref } from "@/lib/showcase";

export default async function Home() {
  const [{ t }, photoModels, videoModels, showcase] = await Promise.all([
    getT(),
    listModels({ task: "text-to-image", limit: 6 }),
    listModels({ task: "text-to-video", limit: 6 }),
    listPublic(undefined, 8),
  ]);

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
                    <video src={c.src} muted loop playsInline autoPlay preload="metadata" className="w-full aspect-[3/4] object-cover bg-black" />
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

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ModelList title={t.home.photoModels} seeAll={t.home.seeAll} href="/models?task=text-to-image" items={photoModels.items} mode="photo" empty={[t.home.modelsDidntLoad, t.home.reload]} />
        <ModelList title={t.home.videoModels} seeAll={t.home.seeAll} href="/models?task=text-to-video" items={videoModels.items} mode="video" empty={[t.home.modelsDidntLoad, t.home.reload]} />
      </section>
    </div>
  );
}

function ModelList({
  title,
  seeAll,
  href,
  items,
  mode,
  empty,
}: {
  title: string;
  seeAll: string;
  href: string;
  items: { id: string; downloads?: number; likes?: number }[];
  mode: "photo" | "video";
  empty: [string, string];
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <Link href={href} className="text-sm text-cobalt underline underline-offset-2">
          {seeAll}
        </Link>
      </div>
      {items.length ? (
        <ul className="rounded-2xl border border-rule overflow-hidden">
          {items.map((m) => (
            <RepoRow key={m.id} r={{ id: m.id, href: `/create?mode=${mode}&model=${encodeURIComponent(m.id)}`, downloads: m.downloads, likes: m.likes }} />
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-rule px-5 py-8 text-sm">
          <p className="font-medium">{empty[0]}</p>
          <p className="text-muted mt-1">{empty[1]}</p>
        </div>
      )}
    </div>
  );
}
