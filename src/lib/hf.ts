/**
 * Thin client for the public Hugging Face Hub API.
 * PostKit renders its own UI on top of this data; nothing here is scraped HTML.
 */

// HF_ENDPOINT matches the variable huggingface_hub uses, so mirrors work the same way.
const HUB = process.env.HF_ENDPOINT || "https://huggingface.co";
const DATASETS_SERVER = "https://datasets-server.huggingface.co";

export type RepoKind = "model" | "dataset";

export type HubModel = {
  id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  library_name?: string;
  lastModified?: string;
  createdAt?: string;
  tags?: string[];
  gated?: boolean | string;
  siblings?: { rfilename: string; size?: number }[];
  safetensors?: { total?: number };
  cardData?: Record<string, unknown>;
};

export type HubDataset = {
  id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  lastModified?: string;
  createdAt?: string;
  tags?: string[];
  gated?: boolean | string;
  description?: string;
  siblings?: { rfilename: string; size?: number }[];
  cardData?: Record<string, unknown>;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

function headers(): HeadersInit {
  const h: Record<string, string> = { accept: "application/json" };
  if (process.env.HF_TOKEN) h.authorization = `Bearer ${process.env.HF_TOKEN}`;
  return h;
}

async function getJSON<T>(url: string, revalidate = 300): Promise<{ data: T; res: Response } | null> {
  try {
    const res = await fetch(url, { headers: headers(), next: { revalidate } });
    if (!res.ok) return null;
    return { data: (await res.json()) as T, res };
  } catch {
    return null;
  }
}

/** The Hub paginates with a cursor in the Link header. */
function cursorFrom(res: Response): string | null {
  const link = res.headers.get("link");
  if (!link) return null;
  const m = link.match(/<([^>]+)>;\s*rel="next"/);
  if (!m) return null;
  try {
    return new URL(m[1]).searchParams.get("cursor");
  } catch {
    return null;
  }
}

export type ListQuery = {
  search?: string;
  task?: string;
  sort?: string;
  author?: string;
  cursor?: string;
  limit?: number;
};

const MODEL_FIELDS = ["downloads", "likes", "pipeline_tag", "library_name", "lastModified", "gated"];

export async function listModels(q: ListQuery = {}): Promise<Page<HubModel>> {
  const u = new URL(`${HUB}/api/models`);
  if (q.search) u.searchParams.set("search", q.search);
  if (q.task) u.searchParams.set("pipeline_tag", q.task);
  if (q.author) u.searchParams.set("author", q.author);
  if (q.cursor) u.searchParams.set("cursor", q.cursor);
  u.searchParams.set("sort", q.sort || "trendingScore");
  u.searchParams.set("direction", "-1");
  u.searchParams.set("limit", String(q.limit ?? 30));
  for (const f of MODEL_FIELDS) u.searchParams.append("expand[]", f);
  const r = await getJSON<HubModel[]>(u.toString());
  if (!r) return { items: [], nextCursor: null };
  return { items: r.data, nextCursor: cursorFrom(r.res) };
}

const DATASET_FIELDS = ["downloads", "likes", "lastModified", "tags", "gated", "description"];

export async function listDatasets(q: ListQuery = {}): Promise<Page<HubDataset>> {
  const u = new URL(`${HUB}/api/datasets`);
  if (q.search) u.searchParams.set("search", q.search);
  if (q.task) u.searchParams.set("filter", `task_categories:${q.task}`);
  if (q.author) u.searchParams.set("author", q.author);
  if (q.cursor) u.searchParams.set("cursor", q.cursor);
  u.searchParams.set("sort", q.sort || "trendingScore");
  u.searchParams.set("direction", "-1");
  u.searchParams.set("limit", String(q.limit ?? 30));
  for (const f of DATASET_FIELDS) u.searchParams.append("expand[]", f);
  const r = await getJSON<HubDataset[]>(u.toString());
  if (!r) return { items: [], nextCursor: null };
  return { items: r.data, nextCursor: cursorFrom(r.res) };
}

export async function getModel(id: string): Promise<HubModel | null> {
  const r = await getJSON<HubModel>(`${HUB}/api/models/${id}?blobs=true`);
  return r?.data ?? null;
}

export async function getDataset(id: string): Promise<HubDataset | null> {
  const r = await getJSON<HubDataset>(`${HUB}/api/datasets/${id}?blobs=true`);
  return r?.data ?? null;
}

/** Raw base URL for files in a repo, used to resolve relative links in cards. */
export function fileBase(kind: RepoKind, id: string): string {
  return kind === "model" ? `${HUB}/${id}/resolve/main/` : `${HUB}/datasets/${id}/resolve/main/`;
}

export function fileUrl(kind: RepoKind, id: string, path: string): string {
  return fileBase(kind, id) + path.split("/").map(encodeURIComponent).join("/");
}

export function stripFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

export async function getReadme(kind: RepoKind, id: string): Promise<string | null> {
  try {
    const res = await fetch(fileUrl(kind, id, "README.md"), {
      headers: process.env.HF_TOKEN ? { authorization: `Bearer ${process.env.HF_TOKEN}` } : {},
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return stripFrontmatter(await res.text());
  } catch {
    return null;
  }
}

export type Split = { dataset: string; config: string; split: string };
export type Preview = {
  split: Split;
  splits: Split[];
  features: { name: string; type: { dtype?: string; _type?: string } }[];
  rows: { row_idx: number; row: Record<string, unknown> }[];
};

export async function getDatasetPreview(id: string, config?: string, split?: string): Promise<Preview | null> {
  const s = await getJSON<{ splits: Split[] }>(`${DATASETS_SERVER}/splits?dataset=${encodeURIComponent(id)}`, 3600);
  const splits = s?.data.splits ?? [];
  if (!splits.length) return null;
  const chosen =
    splits.find((x) => x.config === config && x.split === split) ??
    splits.find((x) => x.split === "train") ??
    splits[0];
  const u = new URL(`${DATASETS_SERVER}/first-rows`);
  u.searchParams.set("dataset", id);
  u.searchParams.set("config", chosen.config);
  u.searchParams.set("split", chosen.split);
  const r = await getJSON<{ features: Preview["features"]; rows: Preview["rows"] }>(u.toString(), 3600);
  if (!r) return { split: chosen, splits, features: [], rows: [] };
  return { split: chosen, splits, features: r.data.features ?? [], rows: (r.data.rows ?? []).slice(0, 50) };
}

export type QuickHit = { id: string; kind: RepoKind };

export async function quickSearch(q: string, limit = 6): Promise<QuickHit[]> {
  if (!q.trim()) return [];
  const u = new URL(`${HUB}/api/quicksearch`);
  u.searchParams.set("q", q);
  u.searchParams.append("type", "model");
  u.searchParams.append("type", "dataset");
  u.searchParams.set("limit", String(limit));
  const r = await getJSON<{ models?: { id: string }[]; datasets?: { id: string }[] }>(u.toString(), 60);
  if (!r) return [];
  return [
    ...(r.data.models ?? []).map((m) => ({ id: m.id, kind: "model" as const })),
    ...(r.data.datasets ?? []).map((d) => ({ id: d.id, kind: "dataset" as const })),
  ];
}
