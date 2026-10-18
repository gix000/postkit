import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { z } from "zod";
import { createAnonClient } from "@/lib/supabase/server";

// Panel step 1: email a sign-in code.
const Body = z.object({ email: z.string().email().max(254) });

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return withCors(NextResponse.json({ error: "email" }, { status: 400 }));

  const { error } = await createAnonClient().auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: true },
  });
  if (error) return withCors(NextResponse.json({ error: "send" }, { status: 429 }));
  return withCors(NextResponse.json({ ok: true }));
}
