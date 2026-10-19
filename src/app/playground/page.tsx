import type { Metadata } from "next";
import Playground from "./Playground";
import { first } from "@/lib/format";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Playground" };

export default async function PlaygroundPage({ searchParams }: PageProps<"/playground">) {
  const sp = await searchParams;
  const mode = first(sp.mode) === "image" ? "image" : "chat";
  const model = first(sp.model);
  const viewer = supabaseEnabled ? await getViewer() : null;
  return <Playground initialMode={mode} initialModel={model} locked={supabaseEnabled && !viewer} />;
}
