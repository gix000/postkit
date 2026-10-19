import Link from "next/link";
import SearchBox from "@/components/SearchBox";
import RepoRow from "@/components/RepoRow";
import { listDatasets, listModels } from "@/lib/hf";
import { listCommunity, repoPath } from "@/lib/community";
import { MODEL_TASKS } from "@/lib/tasks";
import { supabaseEnabled } from "@/lib/supabase/config";

export default async function Home() {
  const [models, datasets, community] = await Promise.all([
    listModels({ limit: 8 }),
    listDatasets({ limit: 6 }),
    listCommunity({ kind: "model", limit: 5 }),
  ]);

  const quickTasks = ["text-generation", "text-to-image", "automatic-speech-recognition", "translation", "feature-extraction", "object-detection"];

  return (
    <div>
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-14 sm:pt-20 pb-12">
        <h1 className="text-[44px] sm:text-[72px] lg:text-[88px] font-semibold leading-[0.95] tracking-[-0.035em] max-w-[13ch] [font-variation-settings:'wdth'_85]">
          Open models, ready to run.
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-muted max-w-[52ch]">
          Browse models and datasets from Hugging Face, publish your own, and test chat and image models in the playground.
        </p>
        <div className="mt-8 max-w-[760px]">
          <SearchBox />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {quickTasks.map((id) => (
            <Link
              key={id}
              href={`/models?task=${id}`}
              className="rounded-full border border-rule bg-surface px-3 py-1.5 text-sm hover:border-ink"
            >
              {MODEL_TASKS.find((t) => t.id === id)?.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10">
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-semibold tracking-tight">Trending models</h2>
            <Link href="/models" className="text-sm text-cobalt underline underline-offset-2">
              All models
            </Link>
          </div>
          {models.items.length ? (
            <ul className="rounded-lg border border-rule overflow-hidden">
              {models.items.map((m) => (
                <RepoRow
                  key={m.id}
                  r={{ id: m.id, href: `/models/${m.id}`, task: m.pipeline_tag, downloads: m.downloads, likes: m.likes }}
                />
              ))}
            </ul>
          ) : (
            <Unavailable />
          )}
        </div>

        <div className="space-y-10">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-2xl font-semibold tracking-tight">Trending datasets</h2>
              <Link href="/datasets" className="text-sm text-cobalt underline underline-offset-2">
                All datasets
              </Link>
            </div>
            {datasets.items.length ? (
              <ul className="rounded-lg border border-rule overflow-hidden">
                {datasets.items.map((d) => (
                  <RepoRow key={d.id} r={{ id: d.id, href: `/datasets/${d.id}`, downloads: d.downloads }} />
                ))}
              </ul>
            ) : (
              <Unavailable />
            )}
          </div>

          <div className="rounded-lg bg-ink text-paper p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Playground</h2>
            <p className="mt-2 text-paper/75 max-w-[40ch]">
              Chat with open language models or generate images from a prompt. Pick any supported model from the hub.
            </p>
            <Link
              href="/playground"
              className="mt-5 inline-flex h-10 items-center rounded-md bg-cobalt text-cobalt-ink px-4 text-sm font-medium hover:opacity-90"
            >
              Open the playground
            </Link>
          </div>

          {supabaseEnabled && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-2xl font-semibold tracking-tight">New from the community</h2>
                <Link href="/new" className="text-sm text-cobalt underline underline-offset-2">
                  Publish a repo
                </Link>
              </div>
              {community.length ? (
                <ul className="rounded-lg border border-rule overflow-hidden">
                  {community.map((r) => (
                    <RepoRow
                      key={r.id}
                      r={{ id: `${r.owner?.username}/${r.slug}`, href: repoPath(r), task: r.task, updated: r.updated_at, community: true }}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-muted text-sm">No community repos yet. Publish the first one.</p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="rounded-lg border border-dashed border-rule px-5 py-8 text-sm">
      <p className="font-medium">The hub didn&apos;t respond.</p>
      <p className="text-muted mt-1">Reload the page in a moment. If it keeps failing, add an HF_TOKEN to raise the rate limit.</p>
    </div>
  );
}
