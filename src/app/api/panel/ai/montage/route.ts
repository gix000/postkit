import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { fail, panelUser } from "@/lib/panelAuth";
import { callTool, AiError } from "@/lib/claude";
import { MontageRequest, MONTAGE_SYSTEM, montageTool, montageContent } from "@/lib/aiMontage";
import { COSTS, CreditError, ensureStarterCredits, refund, spend } from "@/lib/credits";

// AI montage plan for footage with little talking: order, pace, title, ending, look.
export const maxDuration = 90;
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const user = await panelUser(request);
  if (user instanceof Response) return user;
  const parsed = MontageRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "The panel sent something the server didn't understand. Update PostKit.", 400);

  const cost = COSTS.montage;
  await ensureStarterCredits(user.sub, user.plan);
  let spent;
  try {
    spent = await spend(user.sub, cost, "ai_montage");
  } catch (err) {
    if (err instanceof CreditError) return fail("credits", err.message, 402, { balance: err.balance, cost });
    throw err;
  }
  try {
    const { input } = await callTool<Record<string, unknown>>({ system: MONTAGE_SYSTEM, content: montageContent(parsed.data), tool: montageTool(parsed.data), maxTokens: 3000, timeoutMs: 80_000 });
    return withCors(NextResponse.json({ plan: input, cost, balance: spent.balance }));
  } catch (err) {
    await refund(user.sub, cost, "ai_montage");
    if (err instanceof AiError) return fail("ai", err.message, 502, { cost: 0 });
    throw err;
  }
}
