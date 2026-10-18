import { NextResponse } from "next/server";
import { serverEnv, site } from "@/lib/env";

// Local-development stand-in for the Whish payment page.
// Only active when WHISH_FAKE=1 and WHISH_MODE is not production.

function sameSite(url: string | null) {
  return !!url && url.startsWith(`${site.url}/`);
}

export async function GET(request: Request) {
  if (!serverEnv.whish().fake) return new NextResponse("Not found", { status: 404 });

  const params = new URL(request.url).searchParams;
  const callback = params.get("callback");
  const redirect = params.get("redirect");
  if (!sameSite(callback) || !sameSite(redirect)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Simulate Whish calling us back, then sending the buyer home.
  await fetch(callback!, { cache: "no-store" });
  return NextResponse.redirect(redirect!, 303);
}
