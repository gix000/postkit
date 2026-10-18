import { NextResponse } from "next/server";
import { z } from "zod";
import { decodeJwt } from "jose";
import { refreshToken, creditBalance, LicenseError } from "@/lib/license";

// Panel heartbeat: called on launch and every 24 hours. Returns a fresh token.
const Body = z.object({ token: z.string().min(20).max(4000) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  try {
    const license = await refreshToken(parsed.data.token);
    const userId = decodeJwt(license.token).sub as string;
    return NextResponse.json({ ...license, credits: await creditBalance(userId) });
  } catch (err) {
    if (err instanceof LicenseError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status });
    }
    throw err;
  }
}
