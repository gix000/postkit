"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createUserClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";

/** Removes one of the visitor's computers. RLS limits the delete to their own rows. */
export async function removeDevice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "en");
  const supabase = await createUserClient();
  await supabase.from("devices").delete().eq("id", id);
  revalidatePath(`/${isLocale(locale) ? locale : "en"}/account`);
}

export async function signOut(formData: FormData) {
  const locale = String(formData.get("locale") ?? "en");
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect(`/${isLocale(locale) ? locale : "en"}`);
}
