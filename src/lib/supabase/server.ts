import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseEnabled } from "./config";

/** One Supabase client per request, shared by every component that asks. */
export const createClient = cache(async () => {
  if (!supabaseEnabled) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
});

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

/**
 * Who is signed in. Verifies the session token locally (no trip to the auth
 * server) and runs once per request however many components call it.
 */
export const getSessionUser = cache(async (): Promise<{ id: string; email?: string } | null> => {
  const sb = await createClient();
  if (!sb) return null;
  const { data } = await sb.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : undefined };
});

export const getViewer = cache(async (): Promise<{ id: string; email?: string; profile: Profile | null } | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const sb = await createClient();
  const { data: profile } = await sb!.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { id: user.id, email: user.email, profile: (profile as Profile) ?? null };
});
