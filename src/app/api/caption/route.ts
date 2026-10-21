import { NextResponse, type NextRequest } from "next/server";
import { clientIp, guardInference } from "@/lib/inference-guard";
import { chatBest, parseJson } from "@/lib/llm";

export const maxDuration = 60;

const LANGS = {
  english: "English",
  arabic: "Lebanese Arabic written in Arabic script (natural spoken Lebanese dialect, not formal MSA)",
  arabizi: "Lebanese Arabizi: Lebanese dialect written in Latin letters with numbers for sounds (3 for ع, 7 for ح, 2 for ء), the way young Lebanese text",
  mix: "the Lebanese mix: mostly English with natural Lebanese Arabizi and a touch of French, like 'Hi kifkon! Ça va?' — how people in Beirut actually talk",
  french: "French",
} as const;
const TONES = { fun: "fun and playful", warm: "warm and friendly", luxury: "elegant and premium", hype: "bold, high-energy hype", pro: "clear and professional" } as const;
const CTAS = {
  dm: "invite people to send a DM",
  whatsapp: "invite people to order or ask on WhatsApp",
  visit: "invite people to visit the shop",
  order: "push them to order now",
  bio: "point to the link in bio",
  none: "no call to action",
} as const;

type Out = { captions?: { text?: string; hashtags?: string[] }[] };

/** Three ready-to-post captions with hashtags. Free, sign-in required, rate-limited. */
export async function POST(req: NextRequest) {
  const guard = await guardInference(clientIp(req.headers));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const b = await req.json().catch(() => ({}));
  const about = typeof b.about === "string" ? b.about.trim().slice(0, 600) : "";
  if (about.length < 3) return NextResponse.json({ error: "Say what the post is about." }, { status: 400 });
  const business = typeof b.business === "string" ? b.business.trim().slice(0, 80) : "";
  const offer = typeof b.offer === "string" ? b.offer.trim().slice(0, 120) : "";
  const lang = (b.lang in LANGS ? b.lang : "mix") as keyof typeof LANGS;
  const tone = (b.tone in TONES ? b.tone : "warm") as keyof typeof TONES;
  const cta = (b.cta in CTAS ? b.cta : "dm") as keyof typeof CTAS;

  const system = `You are a top social media copywriter for small businesses in Lebanon. Write Instagram/Facebook/TikTok captions that sound human, local and scroll-stopping. Return ONLY JSON: {"captions":[{"text":"...","hashtags":["#...", ...]}, ...]} with exactly 3 captions that differ in angle (e.g. story, short punchy, offer-led). Each caption: 1 to 4 short lines, 1 to 3 fitting emojis, no hashtags inside the text, max 60 words. 6 to 10 hashtags per caption: mix popular ones with local Lebanese ones (e.g. #Beirut #Lebanon #LebanonFood) only where they fit. Never invent prices, addresses, phone numbers or claims the user didn't give.
Sound genuinely Lebanese when the language is Lebanese: use real expressions such as Yalla, Kifkon, Ahla w sahla, Sahtein, Tfaddalo, Ma tfawwetouwa, 3an jad, Habibi, Bonjour/Merci (Arabizi), or يلّا، كيفكن، أهلا وسهلا، صحتين، تفضّلوا، ما تفوّتوها، عن جد (Arabic script). Never use English slang like "yer" or "y'all".`;
  const user = `Language: ${LANGS[lang]}.
Tone: ${TONES[tone]}.
Call to action: ${CTAS[cta]}.
Business: ${business || "(not given)"}.
Offer or price to mention: ${offer || "(none)"}.
The post is about: ${about}`;

  try {
    const out = parseJson<Out>(await chatBest(system, user, 1500));
    const captions = (out?.captions ?? [])
      .map((c) => ({
        text: String(c.text ?? "").replace(/\*+/g, "").trim(),
        hashtags: (c.hashtags ?? []).map((h) => String(h).trim()).filter((h) => /^#\S{2,40}$/.test(h)).slice(0, 12),
      }))
      .filter((c) => c.text.length > 3)
      .slice(0, 3);
    if (!captions.length) return NextResponse.json({ error: "Couldn't write captions this time. Try again." }, { status: 502 });
    return NextResponse.json({ captions });
  } catch {
    return NextResponse.json({ error: "Couldn't write captions this time. Try again." }, { status: 502 });
  }
}
