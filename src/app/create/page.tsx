import type { Metadata } from "next";
import Studio, { type Tab } from "./Studio";
import { first } from "@/lib/format";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getBalance } from "@/lib/credits";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.create.title };
}

/** Only our own storage or the public hub may be passed in as a starting photo. */
function safeImage(url?: string) {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname.endsWith(".supabase.co") || u.hostname === "huggingface.co") ? url : undefined;
  } catch {
    return undefined;
  }
}

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const sp = await searchParams;
  const m = first(sp.mode);
  const tab: Tab = m === "video" || m === "animate" ? "video" : m === "chat" ? "chat" : "photo";
  const viewer = supabaseEnabled ? await getViewer() : null;
  const credits = viewer ? await getBalance() : null;
  return (
    <Studio
      initialTab={tab}
      initialModel={first(sp.model)}
      initialPrompt={first(sp.prompt)?.slice(0, 2000)}
      initialSize={first(sp.size)}
      initialImage={safeImage(first(sp.from))}
      locked={supabaseEnabled && !viewer}
      credits={credits}
    />
  );
}
