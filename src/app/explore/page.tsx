import type { Metadata } from "next";
import Link from "next/link";
import CreationGrid from "@/components/CreationGrid";
import { listPublic } from "@/lib/creations";
import { getT } from "@/lib/i18n/server";
import { first } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.explore.title };
}

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const { t } = await getT();
  const k = first((await searchParams).kind);
  const kind = k === "photo" || k === "video" ? k : undefined;
  const items = await listPublic(kind, 60);
  const filters = [
    { id: undefined, label: t.library.all, href: "/explore" },
    { id: "photo", label: t.library.photos, href: "/explore?kind=photo" },
    { id: "video", label: t.library.videos, href: "/explore?kind=video" },
  ];

  return (
    <div>
      <section className="relative overflow-hidden border-b border-rule mb-8">
        <div className="neon-field opacity-70" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 pb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[44px] sm:text-[64px] font-extrabold tracking-[-0.03em] leading-none">{t.explore.title}</h1>
            <p className="text-muted mt-3 max-w-[50ch]">{t.explore.sub}</p>
          </div>
          <nav className="glass flex gap-1 rounded-full p-1" aria-label={t.explore.title}>
            {filters.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                aria-current={kind === f.id ? "page" : undefined}
                className={`tap h-9 px-4 inline-flex items-center rounded-full text-sm font-semibold ${kind === f.id ? "btn-neon" : "text-muted hover:text-ink"}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        {items.length === 0 ? (
          <div className="glass rounded-2xl px-6 py-10 text-center">
            <p className="text-muted">{t.explore.empty}</p>
            <Link href="/create" className="tap btn-neon mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
              {t.library.start}
            </Link>
          </div>
        ) : (
          <CreationGrid
            key={kind ?? "all"}
            items={items.map(({ id, kind, tool, url, prompt, model, is_public, owner }) => ({
              id,
              kind,
              tool,
              url,
              prompt,
              model,
              is_public,
              owner: owner?.display_name || owner?.username || null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
