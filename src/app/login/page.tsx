import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { first } from "@/lib/format";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.nav.signIn };
}

function safeNext(n?: string) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext(first((await searchParams).next));
  const { t } = await getT();
  if (!supabaseEnabled) {
    return (
      <div className="mx-auto max-w-[420px] px-4 pt-20">
        <h1 className="text-3xl font-semibold tracking-tight">{t.login.off}</h1>
        <p className="text-muted mt-2">{t.login.offBody}</p>
      </div>
    );
  }
  if (await getViewer()) redirect(next);
  return (
    <div className="mx-auto max-w-[420px] px-4 pt-16 sm:pt-24">
      <h1 className="text-4xl font-semibold tracking-tight">{t.login.title}</h1>
      <p className="text-muted mt-2 mb-8">{t.login.sub}</p>
      <LoginForm next={next} />
    </div>
  );
}
