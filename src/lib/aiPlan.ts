import "server-only";
import { z } from "zod";

// The AI editor's planning step: what the panel sends, what Claude is told, and the
// shape of the plan it must return. The panel executes the plan on a copy of the sequence.

const Id = z.string().min(1).max(60);
export const PlanRequest = z.object({
  instruction: z.string().min(1).max(2000),
  taste: z.record(z.string(), z.unknown()).optional(),
  video: z.object({
    name: z.string().max(200).optional(),
    duration: z.number().min(0).max(4 * 3600),
    fps: z.number().min(1).max(240).optional(),
    width: z.number().int().min(16).max(16384).optional(),
    height: z.number().int().min(16).max(16384).optional(),
    cameras: z.number().int().min(1).max(8).optional(),
    hasMusic: z.boolean().optional(),
  }),
  transcript: z
    .object({
      language: z.string().max(20).nullable().optional(),
      segments: z.array(z.object({ id: z.number().int(), start: z.number(), end: z.number(), text: z.string().max(2000) })).max(3000),
    })
    .nullable()
    .optional(),
  pauses: z.object({ count: z.number(), seconds: z.number(), longest: z.number().optional() }).optional(),
  frames: z.array(z.object({ t: z.number(), data: z.string().max(600_000) })).max(6).optional(),
  catalog: z.object({
    templates: z.array(z.object({ id: Id, name: z.string().max(60), cat: z.string().max(40), fields: z.record(z.string(), z.unknown()).optional() })).max(300),
    captions: z.array(z.object({ id: Id, name: z.string().max(60) })).max(60),
    looks: z.array(z.object({ id: Id, name: z.string().max(60), note: z.string().max(120).optional() })).max(40),
    sfx: z.array(z.object({ id: Id, name: z.string().max(60), tags: z.array(z.string().max(30)).max(10).optional() })).max(200),
    presets: z.array(Id).max(60),
    voices: z.array(Id).max(20).optional(),
    fonts: z.array(z.string().max(40)).max(60).optional(),
  }),
});
export type PlanRequest = z.infer<typeof PlanRequest>;

export const SYSTEM = `You are the editor inside PostKit, a panel in Adobe Premiere Pro used by people who make short-form videos (TikTok, Reels, Shorts) and YouTube videos, many of them in Lebanese Arabic, English and French, often mixed in one sentence.

You get a request in plain words, the transcript split into numbered segments with times, a few stills from the video, facts about the sequence, the creator's saved taste (if any), and the exact tools, templates, caption styles, looks and sounds that exist. You answer with one edit plan by calling submit_plan. The panel shows the plan to the creator first, then performs it on a copy of the sequence.

How to plan:
- Use only what the request and the video need. "Add captions" gets captions and nothing else. "Clean it up" gets pauses and retakes removed. A general request ("edit this", "make it a reel", "make it viral") gets a complete edit: cut, hook, captions, zoom, a few graphics and sounds, colour.
- Decide the kind of video from the transcript and the stills, and choose a style that fits it — pace, caption style, accent colour, font. If the taste says otherwise, the taste wins.
- Retakes: remove repeated takes of the same line (keep the last complete one), false starts, abandoned sentences and obvious stumbles. Never remove something said only once unless asked. Give segment ids.
- Silences: for social edits, remove pauses (min_pause 0.35–0.5 s, padding 0.08–0.15 s; faster pace → smaller numbers). For calm or emotional videos be gentler (0.7 s, 0.2 s).
- Hook: for short-form edits, pick the one most compelling line — a result, a surprise, a bold claim or a question — that isn't already first; it is copied to the start. Skip it for videos under 15 seconds or ones that already open strongly.
- Zoom: punch-ins change framing at sentence starts for talking heads; slow pushes suit calm videos. Amount 8–18.
- Graphics are few and purposeful: a title for the topic near the start, a lower third when a person introduces themselves, liquid-glass cards or counters for key points and numbers, callouts when something is pointed at, a call to action near the end. At most one every 6 seconds. Keep field text short (titles six words or fewer), in the language spoken at that moment, spelled as in the transcript. Place them with y between 0.15 and 0.4 when captions are on (captions sit at about 0.66), and never overlap two graphics in time.
- Sound effects go on graphic entrances, transitions and a few key words. Never more than one per 2 seconds. gain_db between -14 and -6.
- Colour: offer 3 or 4 looks that suit the footage you can see, and recommend one. Skip colour if the request is only about text or sound.
- Voice: suggest a preset when the request mentions sound, or for a full edit.
- Write the summary and every "why" in the same language as the request, in one short, concrete sentence each, addressed to the creator. No hype.
- Refer to moments by segment id. offset is seconds after that segment's start.
- If there is no transcript, plan only what doesn't need one (silences, colour, voice, graphics at offsets from segment 0 are not possible — use none).`;

/** The submit_plan tool, with enums built from what this panel actually has. */
export function planTool(req: PlanRequest) {
  const c = req.catalog;
  const ids = (list: { id: string }[]) => (list.length ? list.map((x) => x.id) : ["none"]);
  const segIds = { type: "integer", description: "A transcript segment id" };
  const why = { type: "string", description: "One short sentence for the creator" };
  return {
    name: "submit_plan",
    description: "Submit the edit plan. Include only the steps this request needs.",
    input_schema: {
      type: "object",
      required: ["summary", "video_type", "style"],
      properties: {
        summary: { type: "string", description: "Two or three sentences: what the edit will do and why." },
        video_type: { type: "string", enum: ["talking_head", "tutorial", "vlog", "podcast", "interview", "product", "story", "comedy", "news", "travel", "food", "fitness", "music", "other"] },
        style: {
          type: "object",
          required: ["name", "pace", "accent"],
          properties: {
            name: { type: "string", description: "Two or three words naming the style" },
            pace: { type: "string", enum: ["calm", "normal", "fast"] },
            accent: { type: "string", description: "Hex colour like #ffd60a" },
            font: c.fonts && c.fonts.length ? { type: "string", enum: c.fonts } : { type: "string" },
            why,
          },
        },
        cut_silences: { type: "object", required: ["min_pause", "padding"], properties: { min_pause: { type: "number" }, padding: { type: "number" }, why } },
        remove_takes: { type: "object", required: ["segment_ids"], properties: { segment_ids: { type: "array", items: segIds }, why } },
        hook: { type: "object", required: ["segment_id"], properties: { segment_id: segIds, why } },
        zoom: { type: "object", required: ["style", "amount"], properties: { style: { type: "string", enum: ["punch", "push"] }, amount: { type: "number" }, why } },
        captions: {
          type: "object",
          required: ["style"],
          properties: {
            style: { type: "string", enum: ["premiere", ...ids(c.captions)], description: "premiere = editable Premiere captions; others are animated styles" },
            words_per_caption: { type: "integer", minimum: 1, maximum: 6 },
            y: { type: "number", description: "0.5–0.8, default 0.66" },
            why,
          },
        },
        graphics: {
          type: "array",
          items: {
            type: "object",
            required: ["template", "segment_id"],
            properties: {
              template: { type: "string", enum: ids(c.templates) },
              segment_id: segIds,
              offset: { type: "number" },
              duration: { type: "number", description: "Seconds, 1.5–6" },
              y: { type: "number" },
              fields: { type: "object", description: "Template text fields by key, e.g. {text, sub}", additionalProperties: { type: "string" } },
              why,
            },
          },
        },
        moves: {
          type: "array",
          description: "Motion presets on the camera clip at a moment (scene changes, emphasis)",
          items: { type: "object", required: ["preset", "segment_id"], properties: { preset: { type: "string", enum: c.presets.length ? c.presets : ["none"] }, segment_id: segIds, why } },
        },
        sfx: {
          type: "array",
          items: {
            type: "object",
            required: ["sound", "segment_id"],
            properties: { sound: { type: "string", enum: ids(c.sfx) }, segment_id: segIds, word: { type: "string", description: "Exact word in that segment to hit, optional" }, offset: { type: "number" }, gain_db: { type: "number" }, why },
          },
        },
        color: { type: "object", required: ["looks", "recommended"], properties: { looks: { type: "array", items: { type: "string", enum: ids(c.looks) }, minItems: 2, maxItems: 4 }, recommended: { type: "string", enum: ids(c.looks) }, why } },
        voice: { type: "object", required: ["preset"], properties: { preset: { type: "string", enum: c.voices && c.voices.length ? c.voices : ["clean"] }, target: { type: "string", enum: ["social", "youtube", "podcast"] }, why } },
        music_duck: { type: "object", properties: { under_db: { type: "number" }, between_db: { type: "number" }, why } },
        chapters: { type: "boolean", description: "Add chapter markers (long videos only)" },
        progress_bar: { type: "boolean" },
      },
    },
  };
}

/** The user message: everything the editor needs to see. */
export function planContent(req: PlanRequest) {
  const lines: string[] = [];
  lines.push(`REQUEST:\n${req.instruction}`);
  if (req.taste && Object.keys(req.taste).length) lines.push(`CREATOR'S TASTE:\n${JSON.stringify(req.taste)}`);
  const v = req.video;
  lines.push(`SEQUENCE: "${v.name || "Untitled"}", ${v.duration.toFixed(1)} s, ${v.width || "?"}×${v.height || "?"} (${v.width && v.height ? (v.width < v.height ? "vertical" : v.width === v.height ? "square" : "horizontal") : "unknown"}), ${v.fps || "?"} fps, ${v.cameras || 1} camera track(s), music track: ${v.hasMusic ? "yes" : "no"}.`);
  if (req.pauses) lines.push(`PAUSES: ${req.pauses.count} pauses longer than 0.4 s, ${req.pauses.seconds.toFixed(1)} s in total.`);
  if (req.transcript && req.transcript.segments.length) {
    let budget = 60_000;
    const segs = req.transcript.segments.map((s) => `[${s.id}] ${s.start.toFixed(1)}–${s.end.toFixed(1)} ${s.text}`);
    const kept: string[] = [];
    for (const s of segs) {
      if (budget - s.length < 0) { kept.push("[… transcript continues …]"); break; }
      kept.push(s);
      budget -= s.length;
    }
    lines.push(`TRANSCRIPT (language: ${req.transcript.language || "unknown"}):\n${kept.join("\n")}`);
  } else lines.push("TRANSCRIPT: none (transcription unavailable).");
  const c = req.catalog;
  const fieldList = (f?: Record<string, unknown>) => (f && Object.keys(f).length ? ` fields: ${Object.keys(f).join(", ")}` : "");
  lines.push(`GRAPHIC TEMPLATES (id — name — category):\n${c.templates.map((t) => `${t.id} — ${t.name} — ${t.cat}${fieldList(t.fields)}`).join("\n")}`);
  lines.push(`CAPTION STYLES: ${c.captions.map((s) => `${s.id} (${s.name})`).join(", ")}, premiere (plain editable Premiere captions)`);
  lines.push(`LOOKS: ${c.looks.map((l) => `${l.id} (${l.name}${l.note ? ": " + l.note : ""})`).join("; ")}`);
  lines.push(`SOUNDS: ${c.sfx.map((s) => `${s.id}${s.tags && s.tags.length ? " [" + s.tags.join(", ") + "]" : ""}`).join(", ")}`);
  lines.push(`MOTION PRESETS: ${c.presets.join(", ")}`);

  const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } })[] = [];
  for (const f of req.frames || []) {
    content.push({ type: "text", text: `Still at ${f.t.toFixed(1)} s:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
  }
  content.push({ type: "text", text: lines.join("\n\n") });
  return content;
}
