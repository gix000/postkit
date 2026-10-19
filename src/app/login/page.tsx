import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { first } from "@/lib/format";
import { getViewer } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

function safeNext(n?: string) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNext(first((await searchParams).next));
  if (!supabaseEnabled) {
    return (
      <div className="mx-auto max-w-[420px] px-4 pt-20">
        <h1 className="text-3xl font-semibold tracking-tight">Accounts are off</h1>
        <p className="text-muted mt-2">Add the Supabase keys from the README to turn on sign-in, uploads and saves.</p>
      </div>
    );
  }
  if (await getViewer()) redirect(next);
  return (
    <div className="mx-auto max-w-[420px] px-4 pt-16 sm:pt-24">
      <h1 className="text-4xl font-semibold tracking-tight">Sign in to PostKit</h1>
      <p className="text-muted mt-2 mb-8">Create photos and videos, save models to your profile, and publish your own.</p>
      <LoginForm next={next} />
    </div>
  );
}
