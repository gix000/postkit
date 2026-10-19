import Link from "next/link";
import type { Preview } from "@/lib/hf";

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.length > 280 ? v.slice(0, 280) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object" && v && "src" in v) return "[media]";
  const s = JSON.stringify(v);
  return s.length > 280 ? s.slice(0, 280) + "…" : s;
}

function imageSrc(v: unknown): string | null {
  if (v && typeof v === "object" && "src" in v && typeof (v as { src: unknown }).src === "string") {
    const src = (v as { src: string }).src;
    return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(src) ? src : null;
  }
  return null;
}

export default function PreviewTable({ preview, basePath }: { preview: Preview; basePath: string }) {
  const cols = preview.features.map((f) => f.name);
  return (
    <div>
      {preview.splits.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Split">
          {preview.splits.slice(0, 24).map((s) => {
            const on = s.config === preview.split.config && s.split === preview.split.split;
            const label = s.config === "default" ? s.split : `${s.config} · ${s.split}`;
            return (
              <Link
                key={s.config + s.split}
                href={`${basePath}?tab=preview&config=${encodeURIComponent(s.config)}&split=${encodeURIComponent(s.split)}`}
                aria-current={on ? "true" : undefined}
                className={`rounded-full border px-2.5 py-1 text-[13px] leading-none ${on ? "bg-ink text-paper border-ink" : "border-rule bg-surface hover:border-ink"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
      {preview.rows.length === 0 ? (
        <p className="text-muted">The preview for this split isn&apos;t ready. Try another split or check back later.</p>
      ) : (
        <>
          <p className="text-sm text-muted mb-2">
            First {preview.rows.length} rows of <span className="font-mono">{preview.split.split}</span>
          </p>
          <div className="rounded-lg border border-rule overflow-auto max-h-[70vh]">
            <table className="text-[13px] min-w-full">
              <thead className="bg-surface sticky top-0">
                <tr>
                  {cols.map((c) => (
                    <th key={c} className="text-left font-medium px-3 py-2 border-b border-rule whitespace-nowrap">
                      {c}
                      <span className="block font-mono text-[11px] text-muted font-normal">
                        {preview.features.find((f) => f.name === c)?.type?.dtype ?? preview.features.find((f) => f.name === c)?.type?._type ?? ""}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row_idx} className="border-b border-rule last:border-b-0 align-top">
                    {cols.map((c) => {
                      const img = imageSrc(r.row[c]);
                      return (
                        <td key={c} className="px-3 py-2 max-w-[420px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {img ? <img src={img} alt="" className="max-h-24 rounded" loading="lazy" /> : <span className="whitespace-pre-wrap break-words">{cell(r.row[c])}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
