import "server-only";
import { z } from "zod";

// AI montage: for footage without much talking. Claude sees one still per clip and
// decides the order, the pace, an opening title, an ending, the transitions and the look.
// The panel then cuts the best moments of each clip to the music's beat.

const Id = z.string().min(1).max(60);
export const MontageRequest = z.object({
  instruction: z.string().max(2000).optional(),
  taste: z.record(z.string(), z.unknown()).optional(),
  format: z.string().max(20).optional(),
  length: z.number().min(3).max(600),
  music: z.object({ duration: z.number(), bpm: z.number().nullable().optional() }).nullable().optional(),
  clips: z.array(z.object({ i: z.number().int(), name: z.string().max(200), duration: z.number(), still: z.string().max(400_000).optional() })).min(1).max(40),
  catalog: z.object({
    titles: z.array(z.object({ id: Id, name: z.string().max(60), fields: z.record(z.string(), z.unknown()).optional() })).max(120),
    transitions: z.array(Id).max(40),
    looks: z.array(z.object({ id: Id, name: z.string().max(60) })).max(40),
    fonts: z.array(z.string().max(40)).max(60).optional(),
  }),
});
export type MontageRequest = z.infer<typeof MontageRequest>;

export const MONTAGE_SYSTEM = `You are the editor inside PostKit, a Premiere Pro panel. The creator gave you raw clips with little or no talking (travel, events, products, food, b-roll, sport) and wants a finished montage cut to music. You see one still per clip. Decide the story and the style, then call submit_montage. The panel picks the best moment of each clip and cuts on the beat.

- Order the clips so the montage builds: a strong, wide or striking opening, variety in the middle (never two near-identical shots in a row), and the best shot near the end. You may leave out clips that are clearly unusable (black, blurry, accidental). Use every clip's index at most once.
- Pace: fast for energetic, sport, nightlife, product; normal for travel and lifestyle; calm for weddings, nature, emotional pieces.
- Opening title: only when it adds something — a place, an event, a product name you can read or infer from the request. Short (four words or fewer), in the request's language. Skip it if you'd be guessing.
- Ending: a short line or call to action only when the request suggests one (a brand, a page to follow). Otherwise none.
- Transitions: pick one style that fits, used on a few cuts; "none" for calm, elegant pieces.
- Zoom on the beat: punch-ins on strong beats suit fast edits; skip for calm ones.
- Look: pick the grade that suits the footage you see.
- Write the summary and why in the request's language, one or two short sentences, no hype.`;

export function montageTool(req: MontageRequest) {
  const titles = req.catalog.titles.map((t) => t.id);
  const looks = req.catalog.looks.map((l) => l.id);
  const why = { type: "string" };
  return {
    name: "submit_montage",
    description: "Submit the montage plan.",
    input_schema: {
      type: "object",
      required: ["summary", "order", "pace", "accent", "look", "transition"],
      properties: {
        summary: { type: "string" },
        order: { type: "array", items: { type: "integer" }, description: "Clip indexes in playing order" },
        pace: { type: "string", enum: ["calm", "normal", "fast"] },
        accent: { type: "string", description: "Hex colour" },
        font: req.catalog.fonts && req.catalog.fonts.length ? { type: "string", enum: req.catalog.fonts } : { type: "string" },
        title: { type: "object", required: ["template", "fields"], properties: { template: { type: "string", enum: titles.length ? titles : ["none"] }, fields: { type: "object", additionalProperties: { type: "string" } }, why } },
        ending: { type: "object", required: ["template", "fields"], properties: { template: { type: "string", enum: titles.length ? titles : ["none"] }, fields: { type: "object", additionalProperties: { type: "string" } }, why } },
        transition: { type: "string", enum: ["none", ...req.catalog.transitions] },
        zoom_on_beat: { type: "boolean" },
        look: { type: "string", enum: looks.length ? looks : ["natural"] },
        why,
      },
    },
  };
}

export function montageContent(req: MontageRequest) {
  const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } })[] = [];
  for (const c of req.clips) {
    content.push({ type: "text", text: `Clip ${c.i}: "${c.name}", ${c.duration.toFixed(1)} s` });
    if (c.still) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: c.still } });
  }
  const lines = [
    `REQUEST: ${req.instruction && req.instruction.trim() ? req.instruction.trim() : "Make a great montage from these clips."}`,
    req.taste && Object.keys(req.taste).length ? `CREATOR'S TASTE: ${JSON.stringify(req.taste)}` : "",
    `FORMAT: ${req.format || "original"}. LENGTH: about ${Math.round(req.length)} s.`,
    req.music ? `MUSIC: ${req.music.duration.toFixed(0)} s${req.music.bpm ? `, about ${Math.round(req.music.bpm)} BPM` : ""}.` : "MUSIC: none chosen.",
    `TITLE AND ENDING TEMPLATES: ${req.catalog.titles.map((t) => `${t.id} (${t.name}${t.fields ? "; fields " + Object.keys(t.fields).join(", ") : ""})`).join("; ")}`,
    `TRANSITIONS: ${req.catalog.transitions.join(", ")}`,
    `LOOKS: ${req.catalog.looks.map((l) => `${l.id} (${l.name})`).join(", ")}`,
  ];
  content.push({ type: "text", text: lines.filter(Boolean).join("\n") });
  return content;
}
