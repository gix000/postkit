import "server-only";
import { createClient, getSessionUser } from "./supabase/server";

export const CREATIONS_BUCKET = "creations";

export type Creation = {
  id: string;
  user_id: string;
  kind: "photo" | "video";
  tool: string;
  prompt: string | null;
  model: string | null;
  size: string | null;
  url: string;
  path: string;
  is_public: boolean;
  created_at: string;
  owner?: { username: string; display_name: string | null } | null;
};

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm" };

/** Stores a finished photo or video in the visitor's gallery and returns the saved row. */
export async function saveCreation(
  userId: string,
  file: Blob,
  meta: { kind: "photo" | "video"; tool: string; prompt?: string; model?: string; size?: string },
): Promise<Creation | null> {
  const sb = await createClient();
  if (!sb) return null;
  const type = file.type || (meta.kind === "video" ? "video/mp4" : "image/png");
  const id = crypto.randomUUID();
  const path = `${userId}/${id}.${EXT[type] ?? (meta.kind === "video" ? "mp4" : "png")}`;
  const { error } = await sb.storage.from(CREATIONS_BUCKET).upload(path, file, { contentType: type, cacheControl: "31536000" });
  if (error) return null;
  const url = sb.storage.from(CREATIONS_BUCKET).getPublicUrl(path).data.publicUrl;
  const { data } = await sb
    .from("creations")
    .insert({
      id,
      user_id: userId,
      kind: meta.kind,
      tool: meta.tool,
      prompt: meta.prompt?.slice(0, 2000) ?? null,
      model: meta.model ?? null,
      size: meta.size ?? null,
      path,
      url,
    })
    .select("*")
    .single();
  return (data as Creation) ?? null;
}

export async function listMine(kind?: "photo" | "video", limit = 60): Promise<Creation[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const sb = (await createClient())!;
  let q = sb.from("creations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data as Creation[]) ?? [];
}

export async function listPublic(kind?: "photo" | "video", limit = 48): Promise<Creation[]> {
  const sb = await createClient();
  if (!sb) return [];
  let q = sb
    .from("creations")
    .select("*, owner:profiles(username, display_name)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data as Creation[]) ?? [];
}
