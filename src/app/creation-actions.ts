"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CREATIONS_BUCKET } from "@/lib/creations";

/** Shows or hides one of your creations on Explore. */
export async function setShared(id: string, shared: boolean) {
  const sb = await createClient();
  if (!sb) return { ok: false };
  const { error } = await sb.from("creations").update({ is_public: shared }).eq("id", id);
  revalidatePath("/library");
  revalidatePath("/explore");
  return { ok: !error };
}

/** Deletes one of your creations and its file. */
export async function deleteCreation(id: string) {
  const sb = await createClient();
  if (!sb) return { ok: false };
  const { data } = await sb.from("creations").select("path").eq("id", id).maybeSingle();
  if (!data) return { ok: false };
  await sb.storage.from(CREATIONS_BUCKET).remove([data.path as string]);
  const { error } = await sb.from("creations").delete().eq("id", id);
  revalidatePath("/library");
  revalidatePath("/explore");
  return { ok: !error };
}
