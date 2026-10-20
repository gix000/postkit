import type { Metadata } from "next";
import Link from "next/link";
import CreationGrid from "@/components/CreationGrid";
import { listMine } from "@/lib/creations";
import { getViewer } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { first } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.library.title };
}

export default async function LibraryPage({ searchParams }: PageProps<"/library">) {
  const [{ t }, viewer] = await Promise.all([getT(), getViewer()]);
  const k = first((await searchParams).kind);
  const kind = k === "photo" || k === "video" ? k : undefined;

  if (!viewer) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10">
        <h1 className="text-[40px] font-bold tracking-tight leading-none">{t.library.title}</h1>
        <div className="glass rounded-2xl px-6 py-10 mt-6">
          <p className="font-semibold">{t.library.signIn}</p>
          <Link href="/login?next=/library" className="tap btn-neon mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
            {t.nav.signIn}
          </Link>
        </div>
      </div>
    );
  }

  const items = await listMine(kind);
  const filters = [
    { id: undefined, label: t.library.all, href: "/library" },
    { id: "photo", label: t.library.photos, href: "/library?kind=photo" },
    { id: "video", label: t.library.videos, href: "/library?kind=video" },
  ];

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-bold tracking-tight leading-none">{t.library.title}</h1>
          <p className="text-muted mt-2">{t.library.sub}</p>
        </div>
        <nav className="glass flex gap-1 rounded-full p-1" aria-label={t.library.title}>
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
      {items.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-rule min-h-[40vh] grid place-items-center text-center px-6">
          <div className="neon-field opacity-60" aria-hidden="true" />
          <div className="relative z-10">
            <p className="font-semibold">{t.library.empty}</p>
            <Link href="/create" className="tap btn-neon mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
              {t.library.start}
            </Link>
          </div>
        </div>
      ) : (
        <CreationGrid key={kind ?? "all"} mine items={items.map(({ id, kind, tool, url, prompt, model, is_public }) => ({ id, kind, tool, url, prompt, model, is_public }))} />
      )}
    </div>
  );
}
