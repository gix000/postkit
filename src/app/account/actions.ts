"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";

/** Removes one of the visitor's computers. RLS limits the delete to their own rows. */
export async function removeDevice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createUserClient();
  await supabase.from("devices").delete().eq("id", id);
  revalidatePath("/account");
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/");
}
