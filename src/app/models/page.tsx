import type { Metadata } from "next";
import HubIndex from "@/components/HubIndex";
import { listModels } from "@/lib/hf";
import { listCommunity, repoPath } from "@/lib/community";
import { MODEL_TASKS } from "@/lib/tasks";
import { first } from "@/lib/format";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Models" };

export default async function ModelsPage({ searchParams }: PageProps<"/models">) {
  const sp = await searchParams;
  const { t } = await getT();
  const state = {
    search: first(sp.search)?.slice(0, 100),
    task: first(sp.task),
    sort: first(sp.sort),
    source: first(sp.source),
    cursor: first(sp.cursor),
  };

  const [hub, community] = await Promise.all([
    state.source === "community" ? { items: [], nextCursor: null } : listModels(state),
    state.source === "hub" || state.cursor ? [] : listCommunity({ kind: "model", search: state.search, task: state.task, limit: 10 }),
  ]);

  return (
    <HubIndex
      base="/models"
      title={t.hub.models}
      tasks={MODEL_TASKS}
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
      hub={hub.items.map((m) => ({
        id: m.id,
        href: `/models/${m.id}`,
        task: m.pipeline_tag,
        downloads: m.downloads,
        likes: m.likes,
        updated: m.lastModified,
        gated: Boolean(m.gated),
      }))}
    />
  );
}
