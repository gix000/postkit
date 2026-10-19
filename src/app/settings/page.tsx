import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  if (!supabaseEnabled) redirect("/login");
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/settings");
  return (
    <div className="mx-auto max-w-[560px] px-4 sm:px-6 pt-10">
      <h1 className="text-4xl font-semibold tracking-tight">Profile settings</h1>
      <p className="text-muted mt-2 mb-8">Signed in as {viewer.email}</p>
      {viewer.profile ? (
        <ProfileForm
          initial={{ username: viewer.profile.username, display_name: viewer.profile.display_name ?? "", bio: viewer.profile.bio ?? "" }}
        />
      ) : (
        <p className="text-danger">
          Your profile wasn&apos;t created. Run supabase/schema.sql in your Supabase project, then sign out and back in.
        </p>
      )}
      <form action="/auth/signout" method="post" className="mt-12 border-t border-rule pt-6">
        <button className="tap h-10 px-4 rounded-full border border-rule bg-surface text-sm font-medium hover:border-ink">Sign out</button>
      </form>
    </div>
  );
}
