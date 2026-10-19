import { NextResponse, type NextRequest } from "next/server";
import { clientIp, guardInference, validModelId } from "@/lib/inference-guard";

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const guard = await guardInference(clientIp(req.headers));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: { model?: unknown; messages?: unknown; temperature?: unknown; max_tokens?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with a model and messages." }, { status: 400 });
  }
  if (!validModelId(body.model)) return NextResponse.json({ error: "Pick a model like owner/name." }, { status: 400 });

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m): m is Msg => !!m && typeof m === "object" && ["system", "user", "assistant"].includes((m as Msg).role) && typeof (m as Msg).content === "string")
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 20_000) }));
  if (!messages.length) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

  const temperature = typeof body.temperature === "number" ? Math.min(2, Math.max(0, body.temperature)) : 0.7;
  const max_tokens = typeof body.max_tokens === "number" ? Math.min(4096, Math.max(16, Math.round(body.max_tokens))) : 1024;

  const upstream = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.HF_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ model: body.model, messages, temperature, max_tokens, stream: true }),
    signal: req.signal,
  }).catch(() => null);

  if (!upstream) return NextResponse.json({ error: "Couldn't reach the inference router. Try again." }, { status: 502 });
  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    const notServed = upstream.status === 400 || upstream.status === 404;
    return NextResponse.json(
      {
        error: notServed
          ? "No inference provider serves this model for chat. Pick another model."
          : `The provider returned an error (${upstream.status}).`,
        detail: detail.slice(0, 500),
      },
      { status: upstream.status === 429 ? 429 : 502 },
    );
  }

  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" },
  });
}
