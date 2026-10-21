import { NextResponse, type NextRequest } from "next/server";
import { clientIp, guardInference } from "@/lib/inference-guard";
import { CreditsError, refund, spend } from "@/lib/credits";
import { TALK_COST } from "@/lib/catalog";
import { CREATIONS_BUCKET, saveCreation } from "@/lib/creations";
import { downloadResult, jobStatus, runRunpod, runpodReady, startJob } from "@/lib/runpod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getSessionUser } from "@/lib/supabase/server";

export const maxDuration = 120;

const VOICES = ["Friendly_Person", "Wise_Woman", "Deep_Voice_Man", "Lively_Girl", "Casual_Guy", "Calm_Woman"];
const EMOTIONS = ["happy", "neutral", "surprised"];
const MAX_BYTES = 4_000_000;

function dataUrl(v: unknown, kinds: RegExp): { blob: Blob; ext: string } | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !kinds.test(m[1])) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) return null;
  const ext = m[1].split("/")[1].replace("jpeg", "jpg").replace("mpeg", "mp3").replace("x-wav", "wav");
  return { blob: new Blob([bytes], { type: m[1] }), ext };
}

const fail = (error: string, status: number, extra?: object) => NextResponse.json({ error, ...extra }, { status });

/** Starts a talking video: voice first (if typed), then the lip-sync video runs in the background. */
export async function POST(req: NextRequest) {
  const guard = await guardInference(clientIp(req.headers));
  if (!guard.ok) return fail(guard.error, guard.status);
  if (!guard.userId) return fail("Sign in to create.", 401);
  if (!runpodReady()) return fail("Talking videos aren't switched on yet.", 503);
  const userId = guard.userId;
  const body = await req.json().catch(() => ({}));

  const image = dataUrl(body.image, /^image\/(png|jpeg|webp)$/);
  if (!image) return fail("Add a photo with a clear face (JPG, PNG or WebP, under 4 MB).", 400);
  const voiceNote = dataUrl(body.audio, /^audio\/(mpeg|mp3|wav|x-wav)$/);
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 220) : "";
  if (!voiceNote && text.length < 2) return fail("Type what it should say, or add a voice note.", 400);
  const voice = VOICES.includes(body.voice) ? body.voice : VOICES[0];
  const emotion = EMOTIONS.includes(body.emotion) ? body.emotion : "happy";

  let left: number;
  try {
    left = await spend(userId, TALK_COST, "talk");
  } catch (e) {
    if (e instanceof CreditsError && e.code === "insufficient") return fail("You need more credits for this.", 402, { code: "insufficient" });
    return fail("Credits are unavailable right now. Try again.", 503);
  }

  const sb = await createClient();
  const temp: string[] = [];
  try {
    const put = async (b: { blob: Blob; ext: string }) => {
      const path = `${userId}/inputs/${crypto.randomUUID()}.${b.ext}`;
      const { error } = await sb!.storage.from(CREATIONS_BUCKET).upload(path, b.blob, { contentType: b.blob.type });
      if (error) throw new Error(`upload failed: ${error.message}`);
      temp.push(path);
      return sb!.storage.from(CREATIONS_BUCKET).getPublicUrl(path).data.publicUrl;
    };
    const imageUrl = await put(image);
    const audioUrl = voiceNote
      ? await put(voiceNote)
      : (await runRunpod("minimax-speech-02-hd", { prompt: text, voice_id: voice, emotion }, 90_000)).url;

    const id = await startJob("infinitetalk", {
      prompt: "The person talks naturally and warmly to the camera, with natural head movement and expressions",
      image: imageUrl,
      audio: audioUrl,
      size: "480p",
    });
    const admin = createAdminClient()!;
    const { error } = await admin.from("jobs").insert({ id, user_id: userId, kind: "talk", endpoint: "infinitetalk", cost: TALK_COST, prompt: text || "Voice note", temp_paths: temp });
    if (error) throw new Error(error.message);
    return NextResponse.json({ job: id, credits: left });
  } catch (e) {
    await refund(userId, TALK_COST, "talk");
    if (temp.length) await sb?.storage.from(CREATIONS_BUCKET).remove(temp);
    console.error("[talk] start failed:", e instanceof Error ? e.message : e);
    return fail("Couldn't start the video. Your credits were returned. Try again.", 502);
  }
}

/** Checks a talking video. Finishing (save + clean up) or refunding happens exactly once. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return fail("Sign in.", 401);
  const id = req.nextUrl.searchParams.get("job") ?? "";
  const admin = createAdminClient();
  if (!admin) return fail("Unavailable.", 503);
  const { data: job } = await admin.from("jobs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!job) return fail("Not found.", 404);

  const creationUrl = async (cid: string | null) =>
    cid ? ((await admin.from("creations").select("id,url").eq("id", cid).maybeSingle()).data ?? null) : null;
  if (job.status === "done") return NextResponse.json({ status: "done", creation: await creationUrl(job.creation_id) });
  if (job.status === "failed") return NextResponse.json({ status: "failed", error: "This video didn't work. Your credits were returned." });
  if (job.status === "processing") return NextResponse.json({ status: "running" });

  const tooOld = Date.now() - new Date(job.created_at).getTime() > 15 * 60_000;
  const s = tooOld ? ({ state: "failed", error: "timed out" } as const) : await jobStatus(job.endpoint, job.id);
  const cleanup = async () => {
    if (job.temp_paths?.length) await admin.storage.from(CREATIONS_BUCKET).remove(job.temp_paths);
  };

  if (s.state === "running") return NextResponse.json({ status: "running" });
  if (s.state === "failed") {
    const { data: claimed } = await admin.from("jobs").update({ status: "failed", error: s.error }).eq("id", id).eq("status", "pending").select("id");
    if (claimed?.length) {
      await refund(user.id, job.cost, "talk");
      await cleanup();
    }
    return NextResponse.json({ status: "failed", error: "This video didn't work. Your credits were returned." });
  }
  // Done on Runpod: claim it so only one request saves it.
  const { data: claimed } = await admin.from("jobs").update({ status: "processing" }).eq("id", id).eq("status", "pending").select("id");
  if (!claimed?.length) return NextResponse.json({ status: "running" });
  try {
    const file = await downloadResult(s.url, "video/mp4");
    const saved = await saveCreation(user.id, file, { kind: "video", tool: "talk", prompt: job.prompt ?? undefined, model: "infinitetalk" });
    await admin.from("jobs").update({ status: "done", creation_id: saved?.id ?? null }).eq("id", id);
    await cleanup();
    return NextResponse.json({ status: "done", creation: saved ? { id: saved.id, url: saved.url } : { url: s.url } });
  } catch (e) {
    await admin.from("jobs").update({ status: "pending" }).eq("id", id);
    console.error("[talk] save failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ status: "running" });
  }
}
