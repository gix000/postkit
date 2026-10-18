import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/server";
import { registerDevice, issueToken, creditBalance, LicenseError } from "@/lib/license";

// Panel step 2: check the code, register this computer, return a licence token.
const Body = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6,10}$/),
  device: z.object({
    hash: z.string().regex(/^[a-f0-9]{32,128}$/i),
    name: z.string().max(80).optional(),
    platform: z.enum(["win", "mac"]).optional(),
  }),
});

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return withCors(NextResponse.json({ error: "bad_request" }, { status: 400 }));

  const { data, error } = await createAnonClient().auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "email",
  });
  if (error || !data.user) return withCors(NextResponse.json({ error: "code" }, { status: 401 }));

  try {
    const { deviceId, sub } = await registerDevice(data.user.id, parsed.data.device);
    const license = await issueToken(data.user.id, deviceId, sub);
    return withCors(NextResponse.json({ ...license, credits: await creditBalance(data.user.id) }));
  } catch (err) {
    if (err instanceof LicenseError) {
      return withCors(NextResponse.json({ error: err.code, message: err.message }, { status: err.status }));
    }
    throw err;
  }
}
