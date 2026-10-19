import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewRepoForm from "./NewRepoForm";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "New repo" };

export default async function NewRepoPage() {
  if (!supabaseEnabled) redirect("/login");
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/new");
  if (!viewer.profile) redirect("/settings");
  return (
    <div className="mx-auto max-w-[720px] px-4 sm:px-6 pt-10">
      <h1 className="text-4xl font-semibold tracking-tight">Publish a repo</h1>
      <p className="text-muted mt-2 mb-8">Share a model or dataset on PostKit. Everything you publish is public.</p>
      <NewRepoForm username={viewer.profile.username} />
    </div>
  );
}
