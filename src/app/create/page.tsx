import type { Metadata } from "next";
import Studio, { type Mode } from "./Studio";
import { first } from "@/lib/format";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Create" };

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const sp = await searchParams;
  const m = first(sp.mode);
  const mode: Mode = m === "video" ? "video" : m === "chat" ? "chat" : "photo";
  const viewer = supabaseEnabled ? await getViewer() : null;
  return (
    <Studio
      initialMode={mode}
      initialModel={first(sp.model)}
      initialPrompt={first(sp.prompt)?.slice(0, 2000)}
      locked={supabaseEnabled && !viewer}
    />
  );
}
