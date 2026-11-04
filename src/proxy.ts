import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const DEVICE_COOKIE = "pk_device";

// Crawlers and scrapers. They were crawling the old Hugging Face mirror pages
// (/models/…, /datasets/…): millions of possible pages, each rendered on the
// server, which used up the free plan's server time. They now get a tiny
// "gone" answer for those pages without rendering anything.
const BOT = /bot|crawl|spider|slurp|scrap|fetch|preview|python|curl|wget|httpx|axios|go-http|java\/|okhttp|headless|lighthouse|bytespider|petalbot|ahrefs|semrush|mj12|dotbot|gptbot|claudebot|ccbot|perplexity|amazonbot|meta-externalagent|facebookexternalhit/i;
const OLD_HUB = /^\/(models|datasets)(\/|$)/;

/** Keeps the Supabase session cookie fresh on every navigation. */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_HUB_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_HUB_SUPABASE_ANON_KEY;
  // A long-lived device id, so the free welcome credits go to one account per phone or laptop.
  // Search-engine landing pages have a fixed language: /use/… English, /ar/use/… Arabic.
  const path = request.nextUrl.pathname;
  if (OLD_HUB.test(path) && BOT.test(request.headers.get("user-agent") || "")) {
    return new NextResponse("Gone", { status: 410, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "public, max-age=86400" } });
  }
  request.headers.delete("x-pk-lang");
  // Lets the layout give every page a canonical URL without its ?query (no duplicate pages in Google).
  request.headers.set("x-pk-path", path);
  if (path === "/ar/use" || path.startsWith("/ar/use/")) request.headers.set("x-pk-lang", "ar");
  else if (path === "/use" || path.startsWith("/use/")) request.headers.set("x-pk-lang", "en");
  const newDevice = request.cookies.has(DEVICE_COOKIE) ? null : crypto.randomUUID();
  if (newDevice) request.cookies.set(DEVICE_COOKIE, newDevice);
  const withDevice = (res: NextResponse) => {
    if (newDevice) res.cookies.set(DEVICE_COOKIE, newDevice, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 730 });
    return res;
  };
  let response = NextResponse.next({ request });
  if (!url || !key) return withDevice(response);

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
  return withDevice(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/search|api/models|api/health|showcase|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2|mp4)$).*)"],
};
