import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { serverEnv, supabaseEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Acts as the signed-in visitor; row-level security applies. */
export async function createUserClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: CookieToSet[]) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the middleware refreshes cookies instead.
        }
      },
    },
  });
}

/** Bypasses row-level security. Server code only — orders, fulfilment, licences. */
export function createAdminClient() {
  return createClient(supabaseEnv.url, serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Stateless client for the panel's email-code sign-in (no cookies). */
export function createAnonClient() {
  return createClient(supabaseEnv.url, supabaseEnv.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUser() {
  if (!supabaseEnv.configured) return null;
  const supabase = await createUserClient();
  // Returns null (never throws) when there is no session or Supabase is unreachable.
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
