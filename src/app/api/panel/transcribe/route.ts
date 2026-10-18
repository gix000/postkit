import { NextResponse } from "next/server";
import { verifyPanelToken, LicenseError } from "@/lib/license";
import { createAdminClient } from "@/lib/supabase/server";
import { preflight, withCors } from "@/lib/cors";

// Word-timed transcription for the panel. The panel uploads a small 16 kHz Opus
// file of the speech track; we forward it to Groq Whisper and return word timings.

export const maxDuration = 60;

const DAILY_LIMIT_SECONDS = 4 * 60 * 60; // fair use: 4 hours of audio a day
const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at 4.5 MB
const LANGUAGES = new Set(["ar", "en", "fr"]);

type GroqWord = { word: string; start: number; end: number };
type GroqSegment = { text: string; start: number; end: number };

function fail(error: string, message: string, status: number) {
  return withCors(NextResponse.json({ error, message }, { status }));
}

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return fail("unavailable", "Transcription isn't set up on the server yet.", 503);

  // 1. Who is asking — a signed licence token from this device.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  let claims;
  try {
    claims = await verifyPanelToken(token);
  } catch (err) {
    if (err instanceof LicenseError) return fail(err.code, err.message, err.status);
    throw err;
  }

  // 2. Fair-use check before spending anything.
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin
    .from("transcription_usage")
    .select("seconds")
    .eq("user_id", claims.sub)
    .eq("day", today)
    .maybeSingle();
  if ((usage?.seconds ?? 0) >= DAILY_LIMIT_SECONDS) {
    return fail("daily_limit", "You've reached today's transcription limit. It resets at midnight UTC.", 429);
  }

  // 3. The audio.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("bad_request", "Send the audio as multipart form data.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) return fail("bad_request", "No audio was sent.", 400);
  if (file.size > MAX_BYTES) {
    return fail("too_long", "This sequence is too long to transcribe in one go. Transcribe up to about 20 minutes at a time.", 413);
  }
  const language = String(form.get("language") ?? "");

  // 4. Groq Whisper with word and segment timings.
  const upstream = new FormData();
  upstream.append("file", file, "speech.ogg");
  upstream.append("model", "whisper-large-v3-turbo");
  upstream.append("response_format", "verbose_json");
  upstream.append("timestamp_granularities[]", "word");
  upstream.append("timestamp_granularities[]", "segment");
  upstream.append("temperature", "0");
  if (LANGUAGES.has(language)) upstream.append("language", language);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: upstream,
    signal: AbortSignal.timeout(55_000),
  }).catch(() => null);

  if (!res || !res.ok) {
    return fail("upstream", "The transcription service didn't respond. Try again in a minute.", 502);
  }
  const data = (await res.json()) as {
    language?: string;
    duration?: number;
    words?: GroqWord[];
    segments?: GroqSegment[];
  };

  const duration = Math.ceil(data.duration ?? 0);
  await admin.rpc("add_transcription_usage", { p_user: claims.sub, p_seconds: duration });

  return withCors(
    NextResponse.json({
      language: data.language ?? null,
      duration: data.duration ?? 0,
      words: (data.words ?? []).map((w) => ({ word: w.word.trim(), start: w.start, end: w.end })),
      segments: (data.segments ?? []).map((s) => ({ text: s.text.trim(), start: s.start, end: s.end })),
    }),
  );
}
