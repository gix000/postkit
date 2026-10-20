import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Keeps the Supabase session cookie fresh on every navigation. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Refreshes an expiring session; verifies the token locally when possible.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/search|api/models|api/health|showcase|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)"],
};
