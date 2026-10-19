import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RepoRow from "@/components/RepoRow";
import { getProfile, listCommunity, listSaves, repoPath, saveHref } from "@/lib/community";
import { getViewer } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  return { title: (await params).username };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();
  const [models, datasets, saves, viewer] = await Promise.all([
    listCommunity({ kind: "model", ownerId: profile.id, limit: 100 }),
    listCommunity({ kind: "dataset", ownerId: profile.id, limit: 100 }),
    listSaves(profile.id),
    getViewer(),
  ]);
  const isMe = viewer?.id === profile.id;
  const repos = [...models, ...datasets].sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
      <aside>
        <div className="h-20 w-20 rounded-full bg-cobalt text-cobalt-ink grid place-items-center text-3xl font-semibold uppercase">
          {(profile.display_name || profile.username).slice(0, 1)}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-4">{profile.display_name || profile.username}</h1>
        <p className="font-mono text-sm text-muted">{profile.username}</p>
        {profile.bio && <p className="mt-3">{profile.bio}</p>}
        {isMe && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/settings" className="inline-flex h-9 items-center rounded-md border border-rule bg-surface px-3 text-sm font-medium hover:border-ink">
              Edit profile
            </Link>
            <form action="/auth/signout" method="post">
              <button className="inline-flex h-9 items-center rounded-md px-3 text-sm text-muted hover:text-ink">Sign out</button>
            </form>
          </div>
        )}
      </aside>

      <div className="space-y-10 min-w-0">
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-semibold tracking-tight">Repos</h2>
            {isMe && (
              <Link href="/new" className="text-sm text-cobalt underline underline-offset-2">
                Publish a repo
              </Link>
            )}
          </div>
          {repos.length ? (
            <ul className="rounded-lg border border-rule overflow-hidden">
              {repos.map((r) => (
                <RepoRow
                  key={r.id}
                  r={{ id: `${profile.username}/${r.slug}`, href: repoPath(r), task: r.task ?? (r.kind === "dataset" ? "Dataset" : null), updated: r.updated_at }}
                />
              ))}
            </ul>
          ) : (
            <p className="text-muted">{isMe ? "You haven't published anything yet." : "No repos yet."}</p>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight mb-3">Saved</h2>
          {saves.length ? (
            <ul className="rounded-lg border border-rule overflow-hidden">
              {saves.map((s) => (
                <RepoRow key={s.ref} r={{ id: s.label, href: saveHref(s), task: s.kind === "model" ? "Model" : "Dataset", community: s.ref.startsWith("pk:") }} />
              ))}
            </ul>
          ) : (
            <p className="text-muted">
              {isMe ? "Save models and datasets from their pages to keep them here." : "Nothing saved yet."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
