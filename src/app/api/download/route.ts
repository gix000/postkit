import { NextResponse } from "next/server";
import { createAdminClient, createUserClient, getUser } from "@/lib/supabase/server";
import { release } from "@/lib/release";
import { site } from "@/lib/env";

// Sends a signed, short-lived link to the panel installer — only to signed-in
// accounts with an active plan. The file itself is never public.
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.redirect(`${site.url}/login?next=${encodeURIComponent("/account")}`, 303);

  const supabase = await createUserClient();
  const { data: sub } = await supabase.from("subscriptions").select("expires_at").eq("user_id", user.id).maybeSingle();
  if (!sub || new Date(sub.expires_at) <= new Date()) {
    return NextResponse.redirect(`${site.url}/account`, 303);
  }

  const { data, error } = await createAdminClient()
    .storage.from(release.bucket)
    .createSignedUrl(release.path, 60, { download: release.fileName });
  if (error || !data) {
    return new NextResponse("The download isn't available right now. Try again in a minute.", { status: 503 });
  }
  return NextResponse.redirect(data.signedUrl, 303);
}
