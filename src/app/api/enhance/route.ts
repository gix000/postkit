import { NextResponse, type NextRequest } from "next/server";
import { clientIp, guardInference } from "@/lib/inference-guard";

export const maxDuration = 60;

const KINDS = ["photo", "edit", "video", "animate"] as const;
type Kind = (typeof KINDS)[number];

const RULES = "Reply with the finished prompt only: one paragraph in English, no lists, no labels, no surrounding quotes. Keep every detail, brand name and number the user gave. Never add people, logos or text the user did not ask for.";

const SYSTEM: Record<Kind, string> = {
  photo: `You are a senior commercial photographer who writes prompts for an AI image model. Turn the user's idea into a polished photo brief of 50 to 90 words covering: the subject, the setting, composition and camera angle, lighting, lens and aperture, color palette, mood, and a style reference (e.g. editorial magazine, luxury ad campaign). If the user wants words in the image, keep those exact words inside double quotes; otherwise end with "no text". ${RULES}`,
  edit: `You write instructions for an AI photo-editing model that changes an uploaded photo. Turn the user's request into one clear instruction of 30 to 60 words describing the new scene, background, light or style vividly and precisely. Always end with a sentence telling the model to keep the main subject exactly the same. ${RULES}`,
  video: `You are a commercial film director who writes prompts for an AI video model that makes 5-second clips. Turn the user's idea into a shot description of 40 to 70 words covering: the subject and its action, the camera movement (push-in, orbit, drone, tracking), lighting, atmosphere and pace, and a style reference. ${RULES}`,
  animate: `You write motion prompts for an AI model that animates a still photo into a 5-second clip. Turn the user's idea into 25 to 45 words describing the camera movement and the subtle natural motion of the subject and scene, keeping it realistic and smooth. ${RULES}`,
};

/** Rewrites a short idea into a polished, model-ready prompt. Free, but needs sign-in and is rate-limited. */
export async function POST(req: NextRequest) {
  const guard = await guardInference(clientIp(req.headers));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  const kind = KINDS.find((k) => k === body?.kind) ?? "photo";
  const idea = typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 1200) : "";
  if (idea.length < 2) return NextResponse.json({ error: "Write a few words first." }, { status: 400 });

  const hf = process.env.HF_TOKEN;
  const rp = process.env.RUNPOD_API_KEY;
  if (!hf && !rp) return NextResponse.json({ error: "Polishing isn't switched on yet." }, { status: 503 });

  try {
    const res = await fetch(hf ? "https://router.huggingface.co/v1/chat/completions" : "https://api.runpod.ai/v2/qwen3-32b-awq/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${hf ?? rp}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: hf ? "Qwen/Qwen2.5-72B-Instruct" : "Qwen/Qwen3-32B-AWQ",
        temperature: 0.6,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM[kind] },
          { role: "user", content: hf ? idea : `${idea} /no_think` },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const data = await res.json().catch(() => null);
    const raw: unknown = data?.choices?.[0]?.message?.content;
    const out = typeof raw === "string" ? raw.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/\*+/g, "").replace(/^["“]|["”]$/g, "").trim() : "";
    if (!res.ok || out.length < 10) {
      console.error("[enhance] failed", res.status, JSON.stringify(data ?? {}).slice(0, 300));
      return NextResponse.json({ error: "Couldn't polish it this time. Try again." }, { status: 502 });
    }
    return NextResponse.json({ prompt: out.slice(0, 2000) });
  } catch {
    return NextResponse.json({ error: "Couldn't polish it this time. Try again." }, { status: 502 });
  }
}
