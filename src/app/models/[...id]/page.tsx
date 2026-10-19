import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RepoShell, { FileTable, Panel, Stat } from "@/components/RepoShell";
import Markdown from "@/components/Markdown";
import SaveButton from "@/components/SaveButton";
import { fileBase, fileUrl, getModel, getReadme } from "@/lib/hf";
import { ago, bytes, compact, first, params as fmtParams } from "@/lib/format";
import { createMode, taskLabel } from "@/lib/tasks";
import { getViewer } from "@/lib/supabase/server";
import { isSaved, saveCount } from "@/lib/community";
import { supabaseEnabled } from "@/lib/supabase/config";

export async function generateMetadata({ params }: PageProps<"/models/[...id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id.map(decodeURIComponent).join("/") };
}

export default async function ModelPage({ params, searchParams }: PageProps<"/models/[...id]">) {
  const id = (await params).id.map(decodeURIComponent).join("/");
  const tab = first((await searchParams).tab) === "files" ? "files" : "card";

  const model = await getModel(id);
  if (!model) notFound();

  const ref = `hf:model:${model.id}`;
  const path = `/models/${model.id}`;
  const [readme, viewer] = await Promise.all([tab === "card" ? getReadme("model", model.id) : null, getViewer()]);
  const [saved, count] = supabaseEnabled ? await Promise.all([isSaved(viewer?.id, ref), saveCount(ref)]) : [false, 0];

  const mode = createMode(model.pipeline_tag);
  const license = (model.cardData?.license as string | undefined) ?? model.tags?.find((t) => t.startsWith("license:"))?.slice(8);
  const size = model.siblings?.reduce((s, f) => s + (f.size ?? 0), 0);

  return (
    <RepoShell
      kindLabel="Model"
      id={model.id}
      meta={[
        model.pipeline_tag && <span className="text-ink">{taskLabel(model.pipeline_tag)}</span>,
        model.library_name,
        fmtParams(model.safetensors?.total),
        license && `License: ${license}`,
        model.gated && "Gated: the author requires accepting terms to download",
      ]}
      actions={
        <>
          {supabaseEnabled && (
            <SaveButton refId={ref} kind="model" label={model.id} path={path} initialSaved={saved} count={count} signedIn={Boolean(viewer)} />
          )}
          {mode && (
            <Link
              href={`/create?mode=${mode}&model=${encodeURIComponent(model.id)}`}
              className="btn-neon inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              {mode === "chat" ? "Chat with this model" : mode === "video" ? "Create a video" : "Create a photo"}
            </Link>
          )}
        </>
      }
      tabs={[
        { id: "card", label: "Model card", href: path },
        { id: "files", label: `Files${model.siblings ? ` (${model.siblings.length})` : ""}`, href: `${path}?tab=files` },
      ]}
      activeTab={tab}
      aside={
        <>
          <Panel title="Stats">
            <Stat label="Downloads (30 days)" value={compact(model.downloads)} />
            <Stat label="Likes" value={compact(model.likes)} />
            {size ? <Stat label="Repo size" value={bytes(size)} /> : null}
            <Stat label="Updated" value={ago(model.lastModified) || "—"} />
          </Panel>
        </>
      }
    >
      {tab === "files" ? (
        <FileTable files={(model.siblings ?? []).map((f) => ({ path: f.rfilename, size: f.size, url: fileUrl("model", model.id, f.rfilename) }))} />
      ) : readme ? (
        <Markdown source={readme} base={fileBase("model", model.id)} />
      ) : (
        <div className="rounded-lg border border-dashed border-rule px-6 py-10">
          <p className="font-medium">This model has no card.</p>
          <p className="text-sm text-muted mt-1">Check the Files tab to see what the repo contains.</p>
        </div>
      )}
    </RepoShell>
  );
}
