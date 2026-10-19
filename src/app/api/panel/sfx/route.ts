import { preflight, withCors } from "@/lib/cors";
import { fail, panelUser } from "@/lib/panelAuth";
import { COSTS, CreditError, ensureStarterCredits, refund, spend } from "@/lib/credits";

// AI sound effects from a text description (ElevenLabs). Returns MP3 bytes.
export const maxDuration = 60;
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const user = await panelUser(request);
  if (user instanceof Response) return user;
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return fail("unavailable", "AI sound effects aren't set up on the server yet.", 503);
  const body = (await request.json().catch(() => ({}))) as { text?: string; seconds?: number };
  const text = String(body.text || "").trim().slice(0, 400);
  if (!text) return fail("bad_request", "Describe the sound.", 400);
  const seconds = Math.max(0.5, Math.min(10, Number(body.seconds) || 2));

  const cost = COSTS.sfx;
  await ensureStarterCredits(user.sub, user.plan);
  let spent;
  try {
    spent = await spend(user.sub, cost, "ai_sfx");
  } catch (err) {
    if (err instanceof CreditError) return fail("credits", err.message, 402, { balance: err.balance, cost });
    throw err;
  }
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.4 }),
    signal: AbortSignal.timeout(55_000),
  }).catch(() => null);
  if (!res || !res.ok) {
    await refund(user.sub, cost, "ai_sfx");
    return fail("upstream", "The sound generator didn't respond. Nothing was charged.", 502);
  }
  const audio = await res.arrayBuffer();
  return withCors(new Response(audio, { headers: { "Content-Type": "audio/mpeg", "X-Credits-Balance": String(spent.balance), "X-Credits-Cost": String(cost), "Access-Control-Expose-Headers": "X-Credits-Balance, X-Credits-Cost" } }));
}
