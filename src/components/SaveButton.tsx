"use client";
import { useOptimistic, useTransition, useState } from "react";
import Link from "next/link";
import { toggleSave } from "@/app/actions";

type Props = {
  refId: string;
  kind: "model" | "dataset";
  label: string;
  path: string;
  initialSaved: boolean;
  count: number;
  signedIn: boolean;
};

export default function SaveButton({ refId, kind, label, path, initialSaved, count, signedIn }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const shownCount = count + (optimistic ? 1 : 0) - (initialSaved ? 1 : 0);
  const cls =
    "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-sm font-medium tabular-nums " +
    (optimistic ? "border-cobalt bg-cobalt-soft text-cobalt" : "border-rule bg-surface hover:border-ink");

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(path)}`} className={cls}>
        Save <span className="text-muted">{shownCount}</span>
      </Link>
    );
  }

  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={optimistic}
        disabled={pending}
        className={cls}
        onClick={() =>
          start(async () => {
            setError(null);
            setOptimistic(!saved);
            const res = await toggleSave({ ref: refId, kind, label, path });
            if ("error" in res && res.error) setError(res.error);
            else if ("saved" in res) setSaved(Boolean(res.saved));
          })
        }
      >
        {optimistic ? "Saved" : "Save"} <span className={optimistic ? "" : "text-muted"}>{shownCount}</span>
      </button>
      {error && <span className="mt-1 text-xs text-danger">{error}</span>}
    </span>
  );
}
