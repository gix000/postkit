import "server-only";
import { createClient, type Profile } from "./supabase/server";
import { STORAGE_BUCKET } from "./supabase/config";
import type { RepoKind } from "./hf";

export type CommunityRepo = {
  id: string;
  owner_id: string;
  kind: RepoKind;
  slug: string;
  description: string | null;
  task: string | null;
  license: string | null;
  readme: string | null;
  created_at: string;
  updated_at: string;
  owner: Pick<Profile, "username" | "display_name" | "avatar_url"> | null;
};

const SELECT = "*, owner:profiles(username, display_name, avatar_url)";

export function repoPath(r: Pick<CommunityRepo, "kind" | "slug" | "owner">): string {
  return `/c/${r.owner?.username ?? "unknown"}/${r.kind}s/${r.slug}`;
}

export async function listCommunity(opts: {
  kind: RepoKind;
  search?: string;
  task?: string;
  ownerId?: string;
  limit?: number;
}): Promise<CommunityRepo[]> {
  const sb = await createClient();
  if (!sb) return [];
  let q = sb.from("repos").select(SELECT).eq("kind", opts.kind).order("created_at", { ascending: false });
  if (opts.search) q = q.ilike("slug", `%${opts.search.replace(/[%_]/g, "")}%`);
  if (opts.task) q = q.eq("task", opts.task);
  if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);
  const { data } = await q.limit(opts.limit ?? 30);
  return (data as CommunityRepo[]) ?? [];
}

export async function getProfile(username: string): Promise<Profile | null> {
  const sb = await createClient();
  if (!sb) return null;
  const { data } = await sb.from("profiles").select("*").eq("username", username).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getCommunityRepo(username: string, kind: RepoKind, slug: string): Promise<CommunityRepo | null> {
  const owner = await getProfile(username);
  if (!owner) return null;
  const sb = await createClient();
  if (!sb) return null;
  const { data } = await sb
    .from("repos")
    .select(SELECT)
    .eq("owner_id", owner.id)
    .eq("kind", kind)
    .eq("slug", slug)
    .maybeSingle();
  return (data as CommunityRepo) ?? null;
}

export type RepoFile = { path: string; size: number; url: string };

/** Lists files in a community repo, walking one level of folders. */
export async function listRepoFiles(repo: Pick<CommunityRepo, "id" | "owner_id">): Promise<RepoFile[]> {
  const sb = await createClient();
  if (!sb) return [];
  const root = `${repo.owner_id}/${repo.id}`;
  const out: RepoFile[] = [];
  async function walk(prefix: string, depth: number) {
    const { data } = await sb!.storage.from(STORAGE_BUCKET).list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
    for (const item of data ?? []) {
      const full = `${prefix}/${item.name}`;
      if (!item.id) {
        if (depth < 3) await walk(full, depth + 1);
        continue;
      }
      const size = Number((item.metadata as { size?: number } | null)?.size ?? 0);
      out.push({
        path: full.slice(root.length + 1),
        size,
        url: sb!.storage.from(STORAGE_BUCKET).getPublicUrl(full).data.publicUrl,
      });
    }
  }
  await walk(root, 0);
  return out;
}

export type Save = { ref: string; kind: RepoKind; label: string; created_at: string };

export async function listSaves(userId: string): Promise<Save[]> {
  const sb = await createClient();
  if (!sb) return [];
  const { data } = await sb.from("saves").select("ref, kind, label, created_at").eq("user_id", userId).order("created_at", { ascending: false });
  return (data as Save[]) ?? [];
}

export async function isSaved(userId: string | undefined, ref: string): Promise<boolean> {
  if (!userId) return false;
  const sb = await createClient();
  if (!sb) return false;
  const { data } = await sb.from("saves").select("ref").eq("user_id", userId).eq("ref", ref).maybeSingle();
  return Boolean(data);
}

export async function saveCount(ref: string): Promise<number> {
  const sb = await createClient();
  if (!sb) return 0;
  const { count } = await sb.from("saves").select("ref", { count: "exact", head: true }).eq("ref", ref);
  return count ?? 0;
}

/** Where a saved ref lives in the app. */
export function saveHref(s: Pick<Save, "ref" | "kind" | "label">): string {
  if (s.ref.startsWith("hf:")) {
    const id = s.ref.split(":").slice(2).join(":");
    return s.kind === "model" ? `/models/${id}` : `/datasets/${id}`;
  }
  // community label is stored as "username/slug"
  const [user, slug] = s.label.split("/");
  return `/c/${user}/${s.kind}s/${slug}`;
}
