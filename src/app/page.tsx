import Link from "next/link";
import HeroPrompt from "@/components/HeroPrompt";
import RepoRow from "@/components/RepoRow";
import Logo from "@/components/Logo";
import { listModels } from "@/lib/hf";
import { listPublic } from "@/lib/creations";
import { getT } from "@/lib/i18n/server";

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
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-20">
          <Logo size={64} />
          <h1 className="mt-8 text-[48px] sm:text-[84px] lg:text-[104px] font-extrabold leading-[0.92] tracking-[-0.04em] max-w-[12ch]">
            {t.home.title}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted max-w-[48ch]">{t.home.sub}</p>
          <div className="mt-10 max-w-[760px]">
            <HeroPrompt />
          </div>
          <ul className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-[960px]">
            {t.home.features.map((f, i) => (
              <li key={f.title}>
                <Link href={featureLinks[i]} className="tap glass block rounded-2xl p-4 h-full hover:border-cobalt/50">
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-sm text-muted mt-1">{f.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {showcase.length > 0 && (
        <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-bold tracking-tight">{t.home.fromExplore}</h2>
            <Link href="/explore" className="text-sm text-cobalt underline underline-offset-2">
              {t.home.exploreAll}
            </Link>
          </div>
          <ul className="flex gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 snap-x">
            {showcase.map((c) => (
              <li key={c.id} className="snap-start shrink-0 w-[220px] sm:w-[260px]">
                <Link
                  href={`/create?mode=${c.kind}${c.prompt ? `&prompt=${encodeURIComponent(c.prompt)}` : ""}`}
                  className="tap block rounded-2xl overflow-hidden border border-rule bg-surface"
                >
                  {c.kind === "video" ? (
                    <video src={c.url} muted loop playsInline autoPlay preload="metadata" className="w-full aspect-[4/5] object-cover bg-black" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.url} alt={c.prompt ?? ""} loading="lazy" className="w-full aspect-[4/5] object-cover" />
                  )}
                  {c.prompt && (
                    <span className="block p-2.5 text-[13px] text-muted line-clamp-2" dir="auto">
                      {c.prompt}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
