"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SLUG = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/;

async function requireUser() {
  const sb = await createClient();
  if (!sb) throw new Error("Accounts aren't set up on this site yet.");
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Sign in first.");
  const { data: profile } = await sb.from("profiles").select("username").eq("id", user.id).single();
  return { sb, user, username: profile?.username as string };
}

export type CreateResult = { ok: true; id: string; ownerId: string; path: string } | { ok: false; error: string };

export async function createRepo(input: {
  kind: "model" | "dataset";
  slug: string;
  description: string;
  task: string;
  license: string;
  readme: string;
}): Promise<CreateResult> {
  try {
    const { sb, user, username } = await requireUser();
    const slug = input.slug.trim();
    if (!SLUG.test(slug)) return { ok: false, error: "Use letters, numbers, dots, dashes or underscores for the name." };
    const { data, error } = await sb
      .from("repos")
      .insert({
        owner_id: user.id,
        kind: input.kind,
        slug,
        description: input.description.trim().slice(0, 300) || null,
        task: input.task || null,
        license: input.license.trim().slice(0, 60) || null,
        readme: input.readme.slice(0, 200_000) || null,
      })
      .select("id")
      .single();
    if (error) {
      return { ok: false, error: error.code === "23505" ? `You already have a ${input.kind} named ${slug}.` : error.message };
    }
    return { ok: true, id: data.id, ownerId: user.id, path: `/c/${username}/${input.kind}s/${slug}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateRepo(input: { id: string; path: string; description: string; task: string; license: string; readme: string }) {
  try {
    const { sb, user } = await requireUser();
    const { error } = await sb
      .from("repos")
      .update({
        description: input.description.trim().slice(0, 300) || null,
        task: input.task || null,
        license: input.license.trim().slice(0, 60) || null,
        readme: input.readme.slice(0, 200_000) || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("owner_id", user.id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath(input.path);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function deleteRepo(id: string) {
  const { sb, user, username } = await requireUser();
  const root = `${user.id}/${id}`;
  // Remove stored files first (one level of folders is enough for most uploads).
  const { data: top } = await sb.storage.from("repos").list(root, { limit: 1000 });
  const paths: string[] = [];
  for (const item of top ?? []) {
    if (item.id) paths.push(`${root}/${item.name}`);
    else {
      const { data: inner } = await sb.storage.from("repos").list(`${root}/${item.name}`, { limit: 1000 });
      for (const f of inner ?? []) if (f.id) paths.push(`${root}/${item.name}/${f.name}`);
    }
  }
  if (paths.length) await sb.storage.from("repos").remove(paths);
  await sb.from("repos").delete().eq("id", id).eq("owner_id", user.id);
  redirect(`/u/${username}`);
}

export async function updateProfile(input: { username: string; display_name: string; bio: string }) {
  try {
    const { sb, user } = await requireUser();
    const username = input.username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,38}$/.test(username)) {
      return { ok: false as const, error: "Usernames are 2–39 characters: lowercase letters, numbers and dashes." };
    }
    const { error } = await sb
      .from("profiles")
      .update({ username, display_name: input.display_name.trim().slice(0, 80) || null, bio: input.bio.trim().slice(0, 300) || null })
      .eq("id", user.id);
    if (error) return { ok: false as const, error: error.code === "23505" ? "That username is taken." : error.message };
    revalidatePath("/", "layout");
    return { ok: true as const, username };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
