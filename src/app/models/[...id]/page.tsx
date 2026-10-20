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
import { getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/models/[...id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id.map(decodeURIComponent).join("/") };
}

export default async function ModelPage({ params, searchParams }: PageProps<"/models/[...id]">) {
  const id = (await params).id.map(decodeURIComponent).join("/");
  const tab = first((await searchParams).tab) === "files" ? "files" : "card";

  const model = await getModel(id);
  if (!model) notFound();
  const { lang, t } = await getT();

  const ref = `hf:model:${model.id}`;
  const path = `/models/${model.id}`;
  const [readme, viewer] = await Promise.all([tab === "card" ? getReadme("model", model.id) : null, getViewer()]);
  const [saved, count] = supabaseEnabled ? await Promise.all([isSaved(viewer?.id, ref), saveCount(ref)]) : [false, 0];

  const mode = createMode(model.pipeline_tag);
  const license = (model.cardData?.license as string | undefined) ?? model.tags?.find((t) => t.startsWith("license:"))?.slice(8);
  const size = model.siblings?.reduce((s, f) => s + (f.size ?? 0), 0);

  return (
    <RepoShell
      kindLabel={t.repo.model}
      id={model.id}
      meta={[
        model.pipeline_tag && <span className="text-ink">{taskLabel(model.pipeline_tag, lang)}</span>,
        model.library_name,
        fmtParams(model.safetensors?.total),
        license && `${t.repo.license}: ${license}`,
        model.gated && t.repo.gated,
      ]}
      actions={
        <>
          {supabaseEnabled && (
            <SaveButton refId={ref} kind="model" label={model.id} path={path} initialSaved={saved} count={count} signedIn={Boolean(viewer)} />
          )}
          {mode && (
            <Link
              href={`/create?mode=${mode}&model=${encodeURIComponent(model.id)}`}
              className="tap btn-neon inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold"
            >
              {mode === "chat" ? t.repo.chatWith : mode === "video" ? t.repo.createVideo : mode === "animate" ? t.repo.animatePhoto : mode === "edit" ? t.repo.editPhoto : t.repo.createPhoto}
            </Link>
          )}
        </>
      }
      tabs={[
        { id: "card", label: t.repo.modelCard, href: path },
        { id: "files", label: `${t.repo.files}${model.siblings ? ` (${model.siblings.length})` : ""}`, href: `${path}?tab=files` },
      ]}
      activeTab={tab}
      aside={
        <>
          <Panel title={t.repo.stats}>
            <Stat label={t.repo.downloads} value={compact(model.downloads)} />
            <Stat label={t.repo.likes} value={compact(model.likes)} />
            {size ? <Stat label={t.repo.size} value={bytes(size)} /> : null}
            <Stat label={t.repo.updated} value={ago(model.lastModified, lang) || "—"} />
          </Panel>
        </>
      }
    >
      {tab === "files" ? (
        <FileTable files={(model.siblings ?? []).map((f) => ({ path: f.rfilename, size: f.size, url: fileUrl("model", model.id, f.rfilename) }))} />
      ) : readme ? (
        <Markdown source={readme} base={fileBase("model", model.id)} />
      ) : (
        <div className="rounded-2xl border border-dashed border-rule px-6 py-10">
          <p className="font-medium">{t.repo.noCard}</p>
          <p className="text-sm text-muted mt-1">{t.repo.noCardHint}</p>
        </div>
      )}
    </RepoShell>
  );
}
