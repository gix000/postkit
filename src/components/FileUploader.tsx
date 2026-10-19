"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { STORAGE_BUCKET } from "@/lib/supabase/config";

export type UploadState = { name: string; status: "waiting" | "uploading" | "done" | "failed"; error?: string };

/** Uploads straight from the browser to Supabase Storage at <owner>/<repo>/<path>. */
export async function uploadFiles(
  ownerId: string,
  repoId: string,
  files: File[],
  onProgress: (states: UploadState[]) => void,
): Promise<boolean> {
  const sb = createClient();
  if (!sb) return false;
  const states: UploadState[] = files.map((f) => ({ name: relPath(f), status: "waiting" }));
  onProgress([...states]);
  let ok = true;
  for (let i = 0; i < files.length; i++) {
    states[i].status = "uploading";
    onProgress([...states]);
    const { error } = await sb.storage
      .from(STORAGE_BUCKET)
      .upload(`${ownerId}/${repoId}/${safe(relPath(files[i]))}`, files[i], { upsert: true, contentType: files[i].type || undefined });
    states[i].status = error ? "failed" : "done";
    if (error) {
      states[i].error = error.message;
      ok = false;
    }
    onProgress([...states]);
  }
  return ok;
}

function relPath(f: File) {
  return (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
}

function safe(p: string) {
  return p
    .split("/")
    .map((s) => s.replace(/[^\w.\-]+/g, "_"))
    .join("/");
}

export function FilePicker({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          setFiles([...files, ...Array.from(e.dataTransfer.files)]);
        }}
        className={`block rounded-lg border-2 border-dashed px-6 py-8 text-center cursor-pointer ${over ? "border-cobalt bg-cobalt-soft" : "border-rule bg-surface"}`}
      >
        <span className="font-medium">Drop files here or choose them</span>
        <span className="block text-sm text-muted mt-1">Weights, configs, CSV, Parquet, JSON — up to your Supabase file limit.</span>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-3 text-sm divide-y divide-rule rounded-md border border-rule">
          {files.map((f, i) => (
            <li key={i} className="flex justify-between gap-3 px-3 py-2">
              <span className="font-mono text-[13px] truncate">{f.name}</span>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-muted hover:text-danger shrink-0">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function UploadProgress({ states }: { states: UploadState[] }) {
  if (!states.length) return null;
  return (
    <ul className="text-sm space-y-1" aria-live="polite">
      {states.map((s) => (
        <li key={s.name} className="flex justify-between gap-3">
          <span className="font-mono text-[13px] truncate">{s.name}</span>
          <span className={s.status === "failed" ? "text-danger" : s.status === "done" ? "text-live" : "text-muted"}>
            {s.status === "failed" ? `Failed: ${s.error}` : s.status === "done" ? "Uploaded" : s.status === "uploading" ? "Uploading…" : "Waiting"}
          </span>
        </li>
      ))}
    </ul>
  );
}
