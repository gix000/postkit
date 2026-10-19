import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { features } from "@/lib/panelAuth";
import { ensureStarterCredits } from "@/lib/credits";
import { z } from "zod";
import { decodeJwt } from "jose";
import { refreshToken, creditBalance, LicenseError } from "@/lib/license";

// Panel heartbeat: called on launch and every 24 hours. Returns a fresh token.
const Body = z.object({ token: z.string().min(20).max(4000) });

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return withCors(NextResponse.json({ error: "bad_request" }, { status: 400 }));

  try {
    const license = await refreshToken(parsed.data.token);
    const claims = decodeJwt(license.token);
    const userId = claims.sub as string;
    await ensureStarterCredits(userId, String(claims.plan || "monthly"));
    return withCors(NextResponse.json({ ...license, credits: await creditBalance(userId), features: features() }));
  } catch (err) {
    if (err instanceof LicenseError) {
      return withCors(NextResponse.json({ error: err.code, message: err.message }, { status: err.status }));
    }
    throw err;
  }
}
