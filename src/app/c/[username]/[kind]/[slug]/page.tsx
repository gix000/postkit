import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RepoShell, { CodeBlock, FileTable, Panel, Stat } from "@/components/RepoShell";
import Markdown from "@/components/Markdown";
import SaveButton from "@/components/SaveButton";
import RepoSettings from "./RepoSettings";
import { getCommunityRepo, isSaved, listRepoFiles, repoPath, saveCount } from "@/lib/community";
import { getViewer } from "@/lib/supabase/server";
import { ago, bytes, first } from "@/lib/format";
import { taskLabel } from "@/lib/tasks";

type Params = PageProps<"/c/[username]/[kind]/[slug]">;

function kindOf(k: string) {
  return k === "models" ? "model" : k === "datasets" ? "dataset" : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username, slug } = await params;
  return { title: `${username}/${slug}` };
}

export default async function CommunityRepoPage({ params, searchParams }: Params) {
  const p = await params;
  const kind = kindOf(p.kind);
  if (!kind) notFound();
  const repo = await getCommunityRepo(p.username, kind, decodeURIComponent(p.slug));
  if (!repo) notFound();

  const viewer = await getViewer();
  const isOwner = viewer?.id === repo.owner_id;
  const tabParam = first((await searchParams).tab);
  const tab = tabParam === "files" || (tabParam === "settings" && isOwner) ? tabParam : "card";

  const path = repoPath(repo);
  const ref = `pk:${repo.id}`;
  const label = `${repo.owner?.username}/${repo.slug}`;
  const [files, saved, count] = await Promise.all([listRepoFiles(repo), isSaved(viewer?.id, ref), saveCount(ref)]);
  const total = files.reduce((s, f) => s + f.size, 0);

  const tabs = [
    { id: "card", label: kind === "model" ? "Model card" : "Dataset card", href: path },
    { id: "files", label: `Files (${files.length})`, href: `${path}?tab=files` },
    ...(isOwner ? [{ id: "settings", label: "Settings", href: `${path}?tab=settings` }] : []),
  ];

  return (
    <RepoShell
      kindLabel={kind === "model" ? "Community model" : "Community dataset"}
      id={label}
      meta={[
        repo.task && <span className="text-ink">{taskLabel(repo.task)}</span>,
        repo.license && `License: ${repo.license}`,
        <Link key="owner" href={`/u/${repo.owner?.username}`} className="underline underline-offset-2">
          by {repo.owner?.display_name || repo.owner?.username}
        </Link>,
      ]}
      actions={
        <SaveButton refId={ref} kind={kind} label={label} path={path} initialSaved={saved} count={count} signedIn={Boolean(viewer)} />
      }
      tabs={tabs}
      activeTab={tab}
      aside={
        tab === "settings" ? undefined : (
          <>
            <Panel title="About">
              {repo.description && <p className="text-sm mb-3">{repo.description}</p>}
              <Stat label="Files" value={files.length} />
              {total > 0 && <Stat label="Size" value={bytes(total)} />}
              <Stat label="Updated" value={ago(repo.updated_at)} />
            </Panel>
            {files.length > 0 && (
              <Panel title="Download with curl">
                <CodeBlock code={`curl -L -O "${files[0].url}"`} />
              </Panel>
            )}
          </>
        )
      }
    >
      {tab === "settings" ? (
        <RepoSettings
          path={path}
          repo={{
            id: repo.id,
            owner_id: repo.owner_id,
            kind,
            slug: repo.slug,
            description: repo.description ?? "",
            task: repo.task ?? "",
            license: repo.license ?? "",
            readme: repo.readme ?? "",
          }}
        />
      ) : tab === "files" ? (
        <FileTable files={files} />
      ) : repo.readme ? (
        <Markdown source={repo.readme} />
      ) : (
        <div className="rounded-lg border border-dashed border-rule px-6 py-10">
          <p className="font-medium">No card yet.</p>
          <p className="text-sm text-muted mt-1">
            {isOwner ? (
              <>
                Add one from{" "}
                <Link href={`${path}?tab=settings`} className="text-cobalt underline underline-offset-2">
                  Settings
                </Link>{" "}
                so people know what this {kind} is for.
              </>
            ) : (
              "Check the Files tab to see what's inside."
            )}
          </p>
        </div>
      )}
    </RepoShell>
  );
}
