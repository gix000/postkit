"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import RepoFields, { type Fields } from "@/components/RepoFields";
import { FilePicker, UploadProgress, uploadFiles, type UploadState } from "@/components/FileUploader";
import { createRepo } from "@/app/repo-actions";

export default function NewRepoForm({ username }: { username: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<"model" | "dataset">("model");
  const [slug, setSlug] = useState("");
  const [fields, setFields] = useState<Fields>({ description: "", task: "", license: "", readme: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<UploadState[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createRepo({ kind, slug, ...fields });
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
      return;
    }
    if (files.length) {
      const ok = await uploadFiles(res.ownerId, res.id, files, setProgress);
      if (!ok) {
        setError("The repo was created, but some files didn't upload. You can add them again from the repo's Settings tab.");
        setBusy(false);
        return;
      }
    }
    router.push(res.path);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium mb-2">Type</legend>
        <div className="flex gap-2">
          {(["model", "dataset"] as const).map((k) => (
            <label
              key={k}
              className={`flex-1 cursor-pointer rounded-md border px-4 py-3 ${kind === k ? "border-cobalt bg-cobalt-soft" : "border-rule bg-surface"}`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              <span className="font-medium">{k === "model" ? "Model" : "Dataset"}</span>
              <span className="block text-sm text-muted">{k === "model" ? "Weights, configs, tokenizer" : "Tables, text, images, audio"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="slug" className="text-sm font-medium">
          Name
        </label>
        <div className="mt-1 flex items-center rounded-md border border-rule bg-surface focus-within:border-cobalt">
          <span className="pl-3 font-mono text-[14px] text-muted">{username}/</span>
          <input
            id="slug"
            required
            pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{0,95}"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-model"
            className="flex-1 h-10 bg-transparent pr-3 font-mono text-[14px] focus:outline-none"
          />
        </div>
      </div>

      <RepoFields kind={kind} value={fields} onChange={setFields} />

      <div>
        <p className="text-sm font-medium mb-1">Files</p>
        <FilePicker files={files} setFiles={setFiles} />
      </div>

      <UploadProgress states={progress} />
      {error && <p className="text-sm text-danger">{error}</p>}

      <button disabled={busy || !slug} className="h-11 px-5 rounded-md bg-ink text-paper text-sm font-medium disabled:opacity-50">
        {busy ? "Publishing…" : `Publish ${kind}`}
      </button>
    </form>
  );
}
