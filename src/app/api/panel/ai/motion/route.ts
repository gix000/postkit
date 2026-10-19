import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { fail, panelUser } from "@/lib/panelAuth";
import { callTool, AiError } from "@/lib/claude";
import { MotionRequest, MOTION_SYSTEM, motionTool, motionContent } from "@/lib/aiMotion";
import { COSTS, CreditError, ensureStarterCredits, refund, spend } from "@/lib/credits";

// AI motion: makes a new motion-graphics scene from a description, or changes one.
export const maxDuration = 90;
export const OPTIONS = preflight;

const DEFAULT_FONTS = ["Montserrat", "Inter", "Poppins", "Anton", "Bebas Neue", "Archivo Black", "Bangers", "Space Grotesk", "JetBrains Mono", "Playfair Display", "DM Serif Display", "Permanent Marker", "Caveat", "Cairo", "Rubik", "Tajawal", "IBM Plex Sans Arabic", "Changa", "Lalezar", "Reem Kufi"];

export async function POST(request: Request) {
  const user = await panelUser(request);
  if (user instanceof Response) return user;
  const parsed = MotionRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "Describe the motion in a sentence or two.", 400);

  const cost = COSTS.motion;
  await ensureStarterCredits(user.sub, user.plan);
  let spent;
  try {
    spent = await spend(user.sub, cost, "ai_motion");
  } catch (err) {
    if (err instanceof CreditError) return fail("credits", err.message, 402, { balance: err.balance, cost });
    throw err;
  }
  try {
    const system = MOTION_SYSTEM.replace("{FONTS}", (parsed.data.fonts && parsed.data.fonts.length ? parsed.data.fonts : DEFAULT_FONTS).join(", "));
    const { input } = await callTool<Record<string, unknown>>({ system, content: motionContent(parsed.data), tool: motionTool, maxTokens: 6000, timeoutMs: 80_000 });
    return withCors(NextResponse.json({ scene: input, cost, balance: spent.balance }));
  } catch (err) {
    await refund(user.sub, cost, "ai_motion");
    if (err instanceof AiError) return fail("ai", err.message, 502, { cost: 0 });
    throw err;
  }
}
