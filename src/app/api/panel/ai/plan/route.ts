import { NextResponse } from "next/server";
import { preflight, withCors } from "@/lib/cors";
import { fail, panelUser } from "@/lib/panelAuth";
import { callTool, AiError } from "@/lib/claude";
import { PlanRequest, SYSTEM, planTool, planContent } from "@/lib/aiPlan";
import { COSTS, CreditError, ensureStarterCredits, refund, spend } from "@/lib/credits";

// The AI editor's plan. Credits are taken before the call and given back if it fails.
export const maxDuration = 120;
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const user = await panelUser(request);
  if (user instanceof Response) return user;

  const parsed = PlanRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", "The panel sent something the server didn't understand. Update PostKit.", 400);
  const req = parsed.data;

  const cost = COSTS.plan(req.video.duration);
  await ensureStarterCredits(user.sub, user.plan);
  let spent;
  try {
    spent = await spend(user.sub, cost, "ai_plan");
  } catch (err) {
    if (err instanceof CreditError) return fail("credits", err.message, 402, { balance: err.balance, cost });
    throw err;
  }

  try {
    const { input, usage } = await callTool<Record<string, unknown>>({ system: SYSTEM, content: planContent(req), tool: planTool(req), maxTokens: 8000 });
    console.log("ai_plan", user.sub, usage.input_tokens, usage.output_tokens);
    return withCors(NextResponse.json({ plan: input, cost, balance: spent.balance }));
  } catch (err) {
    await refund(user.sub, cost, "ai_plan");
    if (err instanceof AiError) return fail("ai", err.message, 502, { cost: 0 });
    throw err;
  }
}
