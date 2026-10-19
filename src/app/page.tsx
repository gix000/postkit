import Link from "next/link";
import HeroPrompt from "@/components/HeroPrompt";
import RepoRow from "@/components/RepoRow";
import Logo from "@/components/Logo";
import { listModels } from "@/lib/hf";
import { listCommunity, repoPath } from "@/lib/community";
import { supabaseEnabled } from "@/lib/supabase/config";

export default async function Home() {
  const [photoModels, videoModels, community] = await Promise.all([
    listModels({ task: "text-to-image", limit: 6 }),
    listModels({ task: "text-to-video", limit: 6 }),
    listCommunity({ kind: "model", limit: 5 }),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="neon-field" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-14 sm:pt-24 pb-16 sm:pb-24">
          <Logo size={64} />
          <h1 className="mt-8 text-[48px] sm:text-[84px] lg:text-[104px] font-extrabold leading-[0.9] tracking-[-0.04em] max-w-[12ch]">
            Create photos and videos.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted max-w-[46ch]">
            Describe it, pick photo or video, and PostKit makes it with open AI models you can browse and choose yourself.
          </p>
          <div className="mt-10 max-w-[760px]">
            <HeroPrompt />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ModelList title="Photo models" href="/models?task=text-to-image" items={photoModels.items} mode="photo" />
        <ModelList title="Video models" href="/models?task=text-to-video" items={videoModels.items} mode="video" />
      </section>

      {supabaseEnabled && (
        <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-bold tracking-tight">From the community</h2>
            <Link href="/new" className="text-sm text-cobalt underline underline-offset-2">
              Publish yours
            </Link>
          </div>
          {community.length ? (
            <ul className="rounded-2xl border border-rule overflow-hidden">
              {community.map((r) => (
                <RepoRow
                  key={r.id}
                  r={{ id: `${r.owner?.username}/${r.slug}`, href: repoPath(r), task: r.task, updated: r.updated_at, community: true }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm">Nothing published yet. Be the first.</p>
          )}
        </section>
      )}
    </div>
  );
}

function ModelList({
  title,
  href,
  items,
  mode,
}: {
  title: string;
  href: string;
  items: { id: string; pipeline_tag?: string; downloads?: number; likes?: number }[];
  mode: "photo" | "video";
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <Link href={href} className="text-sm text-cobalt underline underline-offset-2">
          See all
        </Link>
      </div>
      {items.length ? (
        <ul className="rounded-2xl border border-rule overflow-hidden">
          {items.map((m) => (
            <RepoRow
              key={m.id}
              r={{ id: m.id, href: `/create?mode=${mode}&model=${encodeURIComponent(m.id)}`, downloads: m.downloads, likes: m.likes }}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-rule px-5 py-8 text-sm">
          <p className="font-medium">Models didn&apos;t load.</p>
          <p className="text-muted mt-1">Reload the page in a moment.</p>
        </div>
      )}
    </div>
  );
}
