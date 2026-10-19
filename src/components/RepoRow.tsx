import Link from "next/link";
import { ago, compact } from "@/lib/format";
import { taskLabel } from "@/lib/tasks";

export type RowData = {
  id: string;
  href: string;
  task?: string | null;
  downloads?: number;
  likes?: number;
  updated?: string | null;
  library?: string | null;
  community?: boolean;
  gated?: boolean;
};

function Download() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Heart() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 13.5S2.5 10.2 2.5 6.3A2.8 2.8 0 0 1 8 5a2.8 2.8 0 0 1 5.5 1.3C13.5 10.2 8 13.5 8 13.5Z" strokeLinejoin="round" />
    </svg>
  );
}

/** One line in the index. Rows, not cards: the repo id is the thing people scan for. */
export default function RepoRow({ r }: { r: RowData }) {
  const [owner, ...rest] = r.id.split("/");
  const name = rest.join("/");
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link href={r.href} className="row-tap group grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-1 px-4 py-3 hover:bg-surface">
        <span className="font-mono text-[14px] leading-6 truncate">
          {name ? (
            <>
              <span className="text-muted">{owner}/</span>
              <span className="font-medium group-hover:text-cobalt">{name}</span>
            </>
          ) : (
            <span className="font-medium group-hover:text-cobalt">{owner}</span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted sm:justify-end">
          {r.community && <span className="text-cobalt font-medium">Community</span>}
          {r.task && <span className="text-ink">{taskLabel(r.task)}</span>}
          {r.gated && <span>Gated</span>}
          {r.updated && <span className="hidden md:inline">Updated {ago(r.updated)}</span>}
          {r.downloads !== undefined && (
            <span className="inline-flex items-center gap-1 tabular-nums" title={`${r.downloads} downloads`}>
              <Download />
              {compact(r.downloads)}
            </span>
          )}
          {r.likes !== undefined && (
            <span className="inline-flex items-center gap-1 tabular-nums" title={`${r.likes} likes`}>
              <Heart />
              {compact(r.likes)}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
