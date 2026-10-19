import "server-only";
import { NextResponse } from "next/server";
import { verifyPanelToken, LicenseError, type LicenseClaims } from "@/lib/license";
import { withCors } from "@/lib/cors";

export function fail(error: string, message: string, status: number, extra: Record<string, unknown> = {}) {
  return withCors(NextResponse.json({ error, message, ...extra }, { status }));
}

/** The panel user behind a request's Bearer licence token, or an error response. */
export async function panelUser(request: Request): Promise<LicenseClaims | Response> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  try {
    return await verifyPanelToken(token);
  } catch (err) {
    if (err instanceof LicenseError) return fail(err.code, err.message, err.status);
    throw err;
  }
}

/** Which server-side services are switched on (the panel hides what isn't). */
export function features() {
  return {
    transcribe: !!process.env.GROQ_API_KEY,
    ai: !!process.env.ANTHROPIC_API_KEY,
    broll: !!process.env.PEXELS_API_KEY,
    sfx: !!process.env.ELEVENLABS_API_KEY,
  };
}
