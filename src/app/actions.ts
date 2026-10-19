"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleSave(input: { ref: string; kind: "model" | "dataset"; label: string; path: string }) {
  const sb = await createClient();
  if (!sb) return { error: "Accounts aren't set up on this site yet." };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Sign in to save." };

  const { data: existing } = await sb.from("saves").select("ref").eq("user_id", user.id).eq("ref", input.ref).maybeSingle();
  if (existing) {
    await sb.from("saves").delete().eq("user_id", user.id).eq("ref", input.ref);
  } else {
    const { error } = await sb.from("saves").insert({ user_id: user.id, ref: input.ref, kind: input.kind, label: input.label });
    if (error) return { error: error.message };
  }
  revalidatePath(input.path);
  return { saved: !existing };
}
