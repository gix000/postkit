import type { Metadata } from "next";
import Studio, { type Tab } from "./Studio";
import { first } from "@/lib/format";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getBalance } from "@/lib/credits";
import { getT } from "@/lib/i18n/server";
import { getTemplate } from "@/lib/templates";

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
  const template = getTemplate(first(sp.template));
  const m = template?.mode ?? first(sp.mode);
  const tab: Tab = m === "video" || m === "animate" ? "video" : m === "chat" ? "chat" : "photo";
  // Both read the same cached session, so they run side by side.
  const [viewer, balance] = supabaseEnabled ? await Promise.all([getViewer(), getBalance()]) : [null, null];
  const credits = viewer ? balance : null;
  return (
    <Studio
      initialTab={tab}
      initialModel={template?.model ?? first(sp.model)}
      initialPrompt={(template?.prompt ?? first(sp.prompt))?.slice(0, 2000)}
      initialSize={template?.size ?? first(sp.size)}
      initialSource={template ? template.needs : first(sp.source) === "photo" ? "photo" : undefined}
      template={template}
      initialImage={safeImage(first(sp.from))}
      locked={supabaseEnabled && !viewer}
      credits={credits}
    />
  );
}
