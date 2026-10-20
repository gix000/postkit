import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RepoShell, { FileTable, Panel, Stat } from "@/components/RepoShell";
import Markdown from "@/components/Markdown";
import SaveButton from "@/components/SaveButton";
import PreviewTable from "@/components/PreviewTable";
import { fileBase, fileUrl, getDataset, getDatasetPreview, getReadme } from "@/lib/hf";
import { ago, bytes, compact, first } from "@/lib/format";
import { taskLabel } from "@/lib/tasks";
import { getViewer } from "@/lib/supabase/server";
import { isSaved, saveCount } from "@/lib/community";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata({ params }: PageProps<"/datasets/[...id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: id.map(decodeURIComponent).join("/") };
}

export default async function DatasetPage({ params, searchParams }: PageProps<"/datasets/[...id]">) {
  const id = (await params).id.map(decodeURIComponent).join("/");
  const sp = await searchParams;
  const tabParam = first(sp.tab);
  const tab = tabParam === "files" || tabParam === "preview" ? tabParam : "card";

  const ds = await getDataset(id);
  if (!ds) notFound();
  const { lang, t: tr } = await getT();

  const ref = `hf:dataset:${ds.id}`;
  const path = `/datasets/${ds.id}`;
  const [readme, preview, viewer] = await Promise.all([
    tab === "card" ? getReadme("dataset", ds.id) : null,
    tab === "preview" ? getDatasetPreview(ds.id, first(sp.config), first(sp.split)) : null,
    getViewer(),
  ]);
  const [saved, count] = supabaseEnabled ? await Promise.all([isSaved(viewer?.id, ref), saveCount(ref)]) : [false, 0];

  const tasks = (ds.tags ?? []).filter((t) => t.startsWith("task_categories:")).map((t) => taskLabel(t.split(":")[1], lang));
  const license = ds.tags?.find((t) => t.startsWith("license:"))?.slice(8);
  const sizeTag = ds.tags?.find((t) => t.startsWith("size_categories:"))?.slice(16);
  const size = ds.siblings?.reduce((s, f) => s + (f.size ?? 0), 0);

  return (
    <RepoShell
      kindLabel={tr.repo.dataset}
      id={ds.id}
      meta={[
        tasks.length > 0 && <span className="text-ink">{tasks.slice(0, 3).join(", ")}</span>,
        sizeTag && `${sizeTag} ${lang === "ar" ? "صف" : "rows"}`,
        license && `${tr.repo.license}: ${license}`,
        ds.gated && tr.repo.gated,
      ]}
      actions={
        <>
          {supabaseEnabled && (
            <SaveButton refId={ref} kind="dataset" label={ds.id} path={path} initialSaved={saved} count={count} signedIn={Boolean(viewer)} />
          )}
        </>
      }
      tabs={[
        { id: "card", label: tr.repo.datasetCard, href: path },
        { id: "preview", label: tr.repo.preview, href: `${path}?tab=preview` },
        { id: "files", label: `${tr.repo.files}${ds.siblings ? ` (${ds.siblings.length})` : ""}`, href: `${path}?tab=files` },
      ]}
      activeTab={tab}
      aside={
        <>
          <Panel title={tr.repo.stats}>
            <Stat label={tr.repo.downloads} value={compact(ds.downloads)} />
            <Stat label={tr.repo.likes} value={compact(ds.likes)} />
            {size ? <Stat label={tr.repo.size} value={bytes(size)} /> : null}
            <Stat label={tr.repo.updated} value={ago(ds.lastModified, lang) || "—"} />
          </Panel>
        </>
      }
    >
      {tab === "files" ? (
        <FileTable files={(ds.siblings ?? []).map((f) => ({ path: f.rfilename, size: f.size, url: fileUrl("dataset", ds.id, f.rfilename) }))} />
      ) : tab === "preview" ? (
        preview ? (
          <PreviewTable preview={preview} basePath={path} />
        ) : (
          <div className="rounded-2xl border border-dashed border-rule px-6 py-10">
            <p className="font-medium">No preview for this dataset.</p>
            <p className="text-sm text-muted mt-1">It may be gated, too large, or in a format the viewer can&apos;t read. Download it from the Files tab.</p>
          </div>
        )
      ) : readme ? (
        <Markdown source={readme} base={fileBase("dataset", ds.id)} />
      ) : (
        <div className="rounded-2xl border border-dashed border-rule px-6 py-10">
          <p className="font-medium">{tr.repo.noCard}</p>
          <p className="text-sm text-muted mt-1">{tr.repo.noCardHint}</p>
        </div>
      )}
    </RepoShell>
  );
}
