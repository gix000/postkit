import Link from "next/link";
import type { ReactNode } from "react";

export type Tab = { id: string; label: string; href: string };

/** Shared frame for model, dataset and community repo pages. */
export default function RepoShell({
  kindLabel,
  id,
  meta,
  actions,
  tabs,
  activeTab,
  aside,
  children,
}: {
  kindLabel: string;
  id: string;
  meta: ReactNode[];
  actions: ReactNode;
  tabs: Tab[];
  activeTab: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [owner, ...rest] = id.split("/");
  const name = rest.join("/");
  return (
    <div>
      <div className="border-b border-rule bg-surface">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8">
          <p className="text-sm text-muted">{kindLabel}</p>
          <h1 className="font-mono text-[22px] sm:text-[28px] leading-tight mt-1 break-all">
            {name ? (
              <>
                <span className="text-muted">{owner}/</span>
                <span className="font-semibold">{name}</span>
              </>
            ) : (
              <span className="font-semibold">{owner}</span>
            )}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            {meta.filter(Boolean).map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>
          <nav className="mt-6 flex gap-1 -mb-px overflow-x-auto" aria-label="Repo sections">
            {tabs.map((t) => {
              const on = t.id === activeTab;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  aria-current={on ? "page" : undefined}
                  className={`px-3 py-2.5 text-[15px] border-b-2 whitespace-nowrap ${on ? "border-cobalt text-ink font-medium" : "border-transparent text-muted hover:text-ink"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <div className="min-w-0">{children}</div>
        {aside && <aside className="min-w-0 space-y-6">{aside}</aside>}
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-rule last:border-b-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums text-right">{value}</span>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-rule bg-surface p-4">
      <h2 className="text-[15px] font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="font-mono text-[12.5px] leading-relaxed bg-paper border border-rule rounded-md p-3 overflow-x-auto whitespace-pre">
      <code>{code}</code>
    </pre>
  );
}

export function FileTable({ files }: { files: { path: string; size?: number; url: string }[] }) {
  if (!files.length) {
    return <p className="text-muted">This repo has no files yet.</p>;
  }
  return (
    <div className="rounded-lg border border-rule overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">File</th>
            <th className="px-4 py-2 font-medium text-right w-28">Size</th>
            <th className="px-4 py-2 w-24">
              <span className="sr-only">Download</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((f) => (
            <tr key={f.path} className="border-t border-rule">
              <td className="px-4 py-2 font-mono text-[13px] break-all">{f.path}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted">{f.size ? formatSize(f.size) : ""}</td>
              <td className="px-4 py-2 text-right">
                <a href={f.url} className="text-cobalt underline underline-offset-2" rel="noreferrer" download>
                  Download
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatSize(n: number) {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
}
