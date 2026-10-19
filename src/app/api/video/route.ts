import { NextResponse, type NextRequest } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { clientIp, guardInference, validModelId } from "@/lib/inference-guard";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase/config";

// Video models take a while. Vercel caps this at your plan's limit.
export const maxDuration = 300;

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
  if (!prompt) return NextResponse.json({ error: "Describe the video first." }, { status: 400 });

  let video: Blob;
  try {
    const client = new InferenceClient(process.env.HF_TOKEN);
    video = await client.textToVideo({ model: body.model, inputs: prompt, provider: "auto" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notServed = /not supported|no provider|not found|404/i.test(msg);
    return NextResponse.json(
      { error: notServed ? "This model can't make videos right now. Pick another model." : "Video generation failed. Try again.", detail: msg.slice(0, 500) },
      { status: 502 },
    );
  }

  // Videos are too big to send back inline, so store them and return a link.
  const sb = await createClient();
  if (sb && guard.userId) {
    const path = `${guard.userId}/creations/${Date.now()}.mp4`;
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, video, { contentType: video.type || "video/mp4" });
    if (!error) {
      return NextResponse.json({ video: sb.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl });
    }
  }

  // No storage available: stream the file straight back.
  return new Response(video.stream(), { headers: { "content-type": video.type || "video/mp4", "cache-control": "no-store" } });
}
