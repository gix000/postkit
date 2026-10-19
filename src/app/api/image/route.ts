import { NextResponse, type NextRequest } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { clientIp, guardInference, validModelId } from "@/lib/inference-guard";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const guard = await guardInference(clientIp(req.headers));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  let body: { model?: unknown; prompt?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with a model and prompt." }, { status: 400 });
  }
  if (!validModelId(body.model)) return NextResponse.json({ error: "Pick a model like owner/name." }, { status: 400 });
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return NextResponse.json({ error: "Describe the image first." }, { status: 400 });

  try {
    const client = new InferenceClient(process.env.HF_TOKEN);
    const image = await client.textToImage({ model: body.model, inputs: prompt, provider: "auto" }, { outputType: "dataUrl" });
    return NextResponse.json({ image });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notServed = /not supported|no provider|not found|404/i.test(msg);
    return NextResponse.json(
      { error: notServed ? "No inference provider serves this model for images. Pick another model." : "Image generation failed. Try again.", detail: msg.slice(0, 500) },
      { status: 502 },
    );
  }
}
