"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import RepoFields, { type Fields } from "@/components/RepoFields";
import { FilePicker, UploadProgress, uploadFiles, type UploadState } from "@/components/FileUploader";
import { deleteRepo, updateRepo } from "@/app/repo-actions";

export default function RepoSettings({
  repo,
  path,
}: {
  repo: { id: string; owner_id: string; kind: "model" | "dataset"; slug: string } & Fields;
  path: string;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({
    description: repo.description ?? "",
    task: repo.task ?? "",
    license: repo.license ?? "",
    readme: repo.readme ?? "",
  });
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<UploadState[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="space-y-12 max-w-[720px]">
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const res = await updateRepo({ id: repo.id, path, ...fields });
          setSaveMsg(res.ok ? "Changes saved." : res.error);
          setBusy(false);
          if (res.ok) router.refresh();
        }}
      >
        <h2 className="text-xl font-semibold">Details</h2>
        <RepoFields kind={repo.kind} value={fields} onChange={setFields} />
        <div className="flex items-center gap-3">
          <button disabled={busy} className="h-10 px-4 rounded-md bg-ink text-paper text-sm font-medium disabled:opacity-50">
            Save changes
          </button>
          {saveMsg && <span className="text-sm text-muted" role="status">{saveMsg}</span>}
        </div>
      </form>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Add files</h2>
        <p className="text-sm text-muted">Files with the same name replace the existing ones.</p>
        <FilePicker files={files} setFiles={setFiles} />
        <UploadProgress states={progress} />
        <button
          disabled={busy || !files.length}
          onClick={async () => {
            setBusy(true);
            const ok = await uploadFiles(repo.owner_id, repo.id, files, setProgress);
            setBusy(false);
            if (ok) {
              setFiles([]);
              router.refresh();
            }
          }}
          className="h-10 px-4 rounded-md border border-rule bg-surface text-sm font-medium hover:border-ink disabled:opacity-50"
        >
          Upload files
        </button>
      </section>

      <section className="rounded-lg border border-danger/40 p-5 space-y-3">
        <h2 className="text-xl font-semibold">Delete this repo</h2>
        <p className="text-sm text-muted">
          This removes the repo, its card and every file. It can&apos;t be undone. Type <span className="font-mono text-ink">{repo.slug}</span> to confirm.
        </p>
        <label htmlFor="confirm-delete" className="sr-only">
          Repo name
        </label>
        <input
          id="confirm-delete"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full h-10 rounded-md border border-rule bg-surface px-3 font-mono text-[14px] focus:outline-none focus:border-danger"
        />
        <button
          disabled={confirm !== repo.slug || busy}
          onClick={async () => {
            setBusy(true);
            await deleteRepo(repo.id);
          }}
          className="h-10 px-4 rounded-md bg-danger text-white text-sm font-medium disabled:opacity-40"
        >
          Delete repo
        </button>
      </section>
    </div>
  );
}
