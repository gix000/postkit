import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RepoShell, { CodeBlock, FileTable, Panel, Stat } from "@/components/RepoShell";
import Markdown from "@/components/Markdown";
import SaveButton from "@/components/SaveButton";
import PreviewTable from "@/components/PreviewTable";
import { fileBase, fileUrl, getDataset, getDatasetPreview, getReadme } from "@/lib/hf";
import { ago, bytes, compact, first } from "@/lib/format";
import { taskLabel } from "@/lib/tasks";
import { datasetSnippet } from "@/lib/snippets";
import { getViewer } from "@/lib/supabase/server";
import { isSaved, saveCount } from "@/lib/community";
import { supabaseEnabled } from "@/lib/supabase/config";

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

  const ref = `hf:dataset:${ds.id}`;
  const path = `/datasets/${ds.id}`;
  const [readme, preview, viewer] = await Promise.all([
    tab === "card" ? getReadme("dataset", ds.id) : null,
    tab === "preview" ? getDatasetPreview(ds.id, first(sp.config), first(sp.split)) : null,
    getViewer(),
  ]);
  const [saved, count] = supabaseEnabled ? await Promise.all([isSaved(viewer?.id, ref), saveCount(ref)]) : [false, 0];

  const tasks = (ds.tags ?? []).filter((t) => t.startsWith("task_categories:")).map((t) => taskLabel(t.split(":")[1]));
  const license = ds.tags?.find((t) => t.startsWith("license:"))?.slice(8);
  const sizeTag = ds.tags?.find((t) => t.startsWith("size_categories:"))?.slice(16);
  const size = ds.siblings?.reduce((s, f) => s + (f.size ?? 0), 0);

  return (
    <RepoShell
      kindLabel="Dataset"
      id={ds.id}
      meta={[
        tasks.length > 0 && <span className="text-ink">{tasks.slice(0, 3).join(", ")}</span>,
        sizeTag && `${sizeTag} rows`,
        license && `License: ${license}`,
        ds.gated && "Gated: accept terms on Hugging Face to download",
      ]}
      actions={
        <>
          {supabaseEnabled && (
            <SaveButton refId={ref} kind="dataset" label={ds.id} path={path} initialSaved={saved} count={count} signedIn={Boolean(viewer)} />
          )}
          <a
            href={`https://huggingface.co/datasets/${ds.id}`}
            rel="noreferrer"
            className="inline-flex h-9 items-center rounded-md border border-rule bg-surface px-3 text-sm font-medium hover:border-ink"
          >
            View on Hugging Face
          </a>
        </>
      }
      tabs={[
        { id: "card", label: "Dataset card", href: path },
        { id: "preview", label: "Preview", href: `${path}?tab=preview` },
        { id: "files", label: `Files${ds.siblings ? ` (${ds.siblings.length})` : ""}`, href: `${path}?tab=files` },
      ]}
      activeTab={tab}
      aside={
        <>
          <Panel title="Stats">
            <Stat label="Downloads (30 days)" value={compact(ds.downloads)} />
            <Stat label="Likes on Hugging Face" value={compact(ds.likes)} />
            {size ? <Stat label="Repo size" value={bytes(size)} /> : null}
            <Stat label="Updated" value={ago(ds.lastModified) || "—"} />
          </Panel>
          <Panel title="Load this dataset">
            <CodeBlock code={datasetSnippet(ds.id)} />
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
          <div className="rounded-lg border border-dashed border-rule px-6 py-10">
            <p className="font-medium">No preview for this dataset.</p>
            <p className="text-sm text-muted mt-1">It may be gated, too large, or in a format the viewer can&apos;t read. Download it from the Files tab.</p>
          </div>
        )
      ) : readme ? (
        <Markdown source={readme} base={fileBase("dataset", ds.id)} />
      ) : (
        <div className="rounded-lg border border-dashed border-rule px-6 py-10">
          <p className="font-medium">This dataset has no card.</p>
          <p className="text-sm text-muted mt-1">Open the Preview tab to see sample rows.</p>
        </div>
      )}
    </RepoShell>
  );
}
