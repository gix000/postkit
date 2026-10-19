/** Placeholders shown the instant a page is tapped, while its data loads. */

export function RowsSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-rule overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-6 px-4 py-3.5 border-b border-rule last:border-b-0">
          <span className="skel h-4" style={{ width: `${38 + ((i * 17) % 30)}%` }} />
          <span className="skel h-3 w-28 hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

export function IndexSkeleton({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-x-10 gap-y-6" role="status" aria-label={`Loading ${title.toLowerCase()}`}>
      <aside>
        <h1 className="text-[32px] font-bold tracking-tight leading-none mb-5">{title}</h1>
        <div className="hidden lg:flex flex-wrap gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="skel h-7" style={{ width: 70 + ((i * 23) % 50) }} />
          ))}
        </div>
        <span className="skel h-11 w-full block lg:hidden" />
      </aside>
      <section>
        <span className="skel h-11 w-full block mb-3" />
        <span className="skel h-8 w-80 max-w-full block mb-3" />
        <RowsSkeleton rows={10} />
      </section>
    </div>
  );
}

export function RepoSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="border-b border-rule">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-6">
          <span className="skel h-3 w-16 block" />
          <span className="skel h-8 w-[420px] max-w-full block mt-3" />
          <span className="skel h-4 w-64 max-w-full block mt-4" />
          <div className="flex gap-2 mt-5">
            <span className="skel h-9 w-32" />
            <span className="skel h-9 w-24" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <div className="space-y-3">
          <span className="skel h-7 w-1/2 block" />
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="skel h-4 block" style={{ width: `${70 + ((i * 13) % 30)}%` }} />
          ))}
        </div>
        <span className="skel h-48 block rounded-2xl" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 space-y-4" role="status" aria-label="Loading">
      <span className="skel h-10 w-64 max-w-full block" />
      <span className="skel h-4 w-96 max-w-full block" />
      <span className="skel h-64 w-full block rounded-2xl mt-6" />
    </div>
  );
}
