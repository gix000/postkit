"use client";
import { DATASET_TASKS, MODEL_TASKS } from "@/lib/tasks";

export type Fields = { description: string; task: string; license: string; readme: string };

const input = "mt-1 w-full h-10 rounded-xl border border-rule bg-surface px-3 focus:outline-none focus:border-cobalt";

export default function RepoFields({ kind, value, onChange }: { kind: "model" | "dataset"; value: Fields; onChange: (v: Fields) => void }) {
  const tasks = kind === "model" ? MODEL_TASKS : DATASET_TASKS;
  return (
    <>
      <div>
        <label htmlFor="description" className="text-sm font-medium">
          Short description
        </label>
        <input
          id="description"
          maxLength={300}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          className={input}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="task" className="text-sm font-medium">
            Task
          </label>
          <select id="task" value={value.task} onChange={(e) => onChange({ ...value, task: e.target.value })} className={input}>
            <option value="">None</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="license" className="text-sm font-medium">
            License
          </label>
          <input
            id="license"
            list="licenses"
            placeholder="e.g. apache-2.0"
            value={value.license}
            onChange={(e) => onChange({ ...value, license: e.target.value })}
            className={input}
          />
          <datalist id="licenses">
            {["apache-2.0", "mit", "cc-by-4.0", "cc-by-nc-4.0", "openrail", "other"].map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      </div>
      <div>
        <label htmlFor="readme" className="text-sm font-medium">
          {kind === "model" ? "Model card" : "Dataset card"} <span className="text-muted font-normal">(Markdown)</span>
        </label>
        <textarea
          id="readme"
          rows={12}
          value={value.readme}
          onChange={(e) => onChange({ ...value, readme: e.target.value })}
          placeholder={"## What it does\n\n## How it was trained\n\n## Limitations"}
          className="mt-1 w-full rounded-xl border border-rule bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed focus:outline-none focus:border-cobalt"
        />
      </div>
    </>
  );
}
