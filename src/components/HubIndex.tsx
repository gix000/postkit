import Link from "next/link";
import RepoRow, { type RowData } from "./RepoRow";
import { MODEL_SORTS, TASK_AR, type Task } from "@/lib/tasks";
import { getT } from "@/lib/i18n/server";

export type IndexState = {
  search?: string;
  task?: string;
  sort?: string;
  source?: string; // "all" | "hub" | "community"
  cursor?: string;
};

function href(base: string, state: IndexState, patch: Partial<IndexState>) {
  const next = { ...state, ...patch };
  const p = new URLSearchParams();
  if (next.search) p.set("search", next.search);
  if (next.task) p.set("task", next.task);
  if (next.sort && next.sort !== "trendingScore") p.set("sort", next.sort);
  if (next.source && next.source !== "all") p.set("source", next.source);
  if (next.cursor) p.set("cursor", next.cursor);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}

type Props = {
  base: "/models" | "/datasets";
  title: string;
  tasks: Task[];
  state: IndexState;
  community: RowData[];
  hub: RowData[];
  nextCursor: string | null;
  communityEnabled: boolean;
};

export default async function HubIndex({ base, title, tasks, state, community, hub, nextCursor, communityEnabled }: Props) {
  const { lang, t: tr } = await getT();
  const label = (task: Task) => (lang === "ar" ? TASK_AR[task.id] ?? task.label : task.label);
  const groups = Array.from(new Set(tasks.map((t) => t.group)));
  const source = state.source || "all";
  const showCommunity = communityEnabled && source !== "hub" && !state.cursor;
  const showHub = source !== "community";
  const total = (showCommunity ? community.length : 0) + (showHub ? hub.length : 0);

  const chips = (
    <>
        {groups.map((g) => (
        <div key={g} className="mb-4">
          <p className="text-sm text-muted mb-1.5">{tr.hub.groups[g] ?? g}</p>
          <div className="flex flex-wrap gap-1.5">
            {tasks
              .filter((t) => t.group === g)
              .map((t) => {
                const on = state.task === t.id;
                return (
                  <Link
                    key={t.id}
                    href={href(base, state, { task: on ? undefined : t.id, cursor: undefined })}
                    aria-current={on ? "true" : undefined}
                    className={`tap rounded-full border px-3 py-1.5 text-[13px] leading-none ${on ? "bg-ink text-paper border-ink" : "border-rule bg-surface hover:border-ink"}`}
                  >
                    {label(t)}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-x-10 gap-y-6">
      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Filters">
        <h1 className="text-[32px] font-semibold tracking-tight leading-none mb-5">{title}</h1>
        <details className="lg:hidden glass rounded-2xl">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">
            {tr.hub.filterByTask}
            {state.task ? `: ${(() => { const f = tasks.find((x) => x.id === state.task); return f ? label(f) : state.task; })()}` : ""}
          </summary>
          <div className="px-4 pb-2">{chips}</div>
        </details>
        <div className="hidden lg:block">{chips}</div>
      </aside>

      <section aria-label={`${title} results`}>
        <form action={base} className="flex flex-col sm:flex-row gap-2 mb-3">
          {state.task && <input type="hidden" name="task" value={state.task} />}
          {state.sort && <input type="hidden" name="sort" value={state.sort} />}
          {state.source && <input type="hidden" name="source" value={state.source} />}
          <label htmlFor="index-search" className="sr-only">
            {tr.hub.filterPlaceholder(title)}
          </label>
          <input
            id="index-search"
            name="search"
            defaultValue={state.search}
            placeholder={tr.hub.filterPlaceholder(lang === "ar" ? title : title.toLowerCase())}
            className="h-10 w-full sm:flex-1 rounded-xl border border-rule bg-surface px-3 text-[15px] placeholder:text-muted focus:outline-none focus:border-cobalt"
          />
          <button className="tap h-10 rounded-full bg-ink text-paper px-4 text-sm font-medium hover:opacity-90">{tr.hub.search}</button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-sm">
          <div className="flex gap-1 overflow-x-auto max-w-full -mx-1 px-1" role="group" aria-label="Sort">
            {MODEL_SORTS.map((s) => {
              const on = (state.sort || "trendingScore") === s.id;
              return (
                <Link
                  key={s.id}
                  href={href(base, state, { sort: s.id, cursor: undefined })}
                  aria-current={on ? "true" : undefined}
                  className={`tap whitespace-nowrap px-3 py-1.5 rounded-full ${on ? "bg-surface border border-rule text-ink font-medium" : "text-muted hover:text-ink border border-transparent"}`}
                >
                  {tr.hub.sort[s.id] ?? s.label}
                </Link>
              );
            })}
          </div>
          {communityEnabled && (
            <div className="flex gap-1" role="group" aria-label="Source">
              {[
                { id: "all", label: tr.hub.source.all },
                { id: "hub", label: tr.hub.source.hub },
                { id: "community", label: tr.hub.source.community },
              ].map((s) => {
                const on = source === s.id;
                return (
                  <Link
                    key={s.id}
                    href={href(base, state, { source: s.id, cursor: undefined })}
                    aria-current={on ? "true" : undefined}
                    className={`tap whitespace-nowrap px-3 py-1.5 rounded-full ${on ? "bg-surface border border-rule text-ink font-medium" : "text-muted hover:text-ink border border-transparent"}`}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-rule px-6 py-10 text-center">
            <p className="font-medium">{tr.hub.nothing}</p>
            <p className="text-sm text-muted mt-1">
              {tr.hub.nothingHint}{" "}
              <Link href={base} className="text-cobalt underline underline-offset-2">
                {tr.hub.reset}
              </Link>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-rule bg-paper overflow-hidden">
            {showCommunity && community.length > 0 && (
              <ul className="border-b border-rule">
                {community.map((r) => (
                  <RepoRow key={r.href} r={r} />
                ))}
              </ul>
            )}
            {showHub && (
              <ul>
                {hub.map((r) => (
                  <RepoRow key={r.href} r={r} />
                ))}
              </ul>
            )}
          </div>
        )}

        {showHub && (nextCursor || state.cursor) && (
          <nav className="flex justify-between mt-4 text-sm" aria-label="Pages">
            {state.cursor ? (
              <Link href={href(base, state, { cursor: undefined })} className="text-cobalt underline underline-offset-2">
                {tr.hub.first}
              </Link>
            ) : (
              <span />
            )}
            {nextCursor && (
              <Link
                href={href(base, state, { cursor: nextCursor })}
                className="tap inline-flex h-9 items-center rounded-full border border-rule bg-surface px-4 font-medium hover:border-ink"
              >
                {tr.hub.next}
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
