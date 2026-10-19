import type { Metadata } from "next";
import HubIndex from "@/components/HubIndex";
import { listDatasets } from "@/lib/hf";
import { listCommunity, repoPath } from "@/lib/community";
import { DATASET_TASKS } from "@/lib/tasks";
import { first } from "@/lib/format";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Datasets" };

function taskFromTags(tags?: string[]) {
  return tags?.find((t) => t.startsWith("task_categories:"))?.split(":")[1];
}

export default async function DatasetsPage({ searchParams }: PageProps<"/datasets">) {
  const sp = await searchParams;
  const state = {
    search: first(sp.search)?.slice(0, 100),
    task: first(sp.task),
    sort: first(sp.sort),
    source: first(sp.source),
    cursor: first(sp.cursor),
  };

  const [hub, community] = await Promise.all([
    state.source === "community" ? { items: [], nextCursor: null } : listDatasets(state),
    state.source === "hub" || state.cursor ? [] : listCommunity({ kind: "dataset", search: state.search, task: state.task, limit: 10 }),
  ]);

  return (
    <HubIndex
      base="/datasets"
      title="Datasets"
      tasks={DATASET_TASKS}
      state={state}
      communityEnabled={supabaseEnabled}
      nextCursor={hub.nextCursor}
      community={community.map((r) => ({
        id: `${r.owner?.username}/${r.slug}`,
        href: repoPath(r),
        task: r.task,
        updated: r.updated_at,
        community: true,
      }))}
      hub={hub.items.map((d) => ({
        id: d.id,
        href: `/datasets/${d.id}`,
        task: taskFromTags(d.tags),
        downloads: d.downloads,
        likes: d.likes,
        updated: d.lastModified,
        gated: Boolean(d.gated),
      }))}
    />
  );
}
