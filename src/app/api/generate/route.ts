import { NextResponse, type NextRequest } from "next/server";
import { InferenceClient } from "@huggingface/inference";
import { clientIp, guardInference, validModelId } from "@/lib/inference-guard";
import {
  CLOUDFLARE,
  CURATED,
  CUTOUT_MODEL,
  SIZES,
  UPSCALE_MODELS,
  UPSCALE_PROMPT,
  costFor,
  isSize,
  presetSuffix,
  type Tool,
} from "@/lib/catalog";
import { CreditsError, refund, spend } from "@/lib/credits";
import { saveCreation } from "@/lib/creations";
import { toEnglishPrompt } from "@/lib/translate";
import { cloudflareReady, runCloudflareImage } from "@/lib/cloudflare";

// Videos can take a few minutes. Vercel stops the function at your plan's limit.
export const maxDuration = 300;

const TOOLS: Tool[] = ["photo", "edit", "video", "animate", "upscale", "cutout"];
const NEEDS_IMAGE: Tool[] = ["edit", "animate", "upscale", "cutout"];
const NEEDS_PROMPT: Tool[] = ["photo", "edit", "video"];
const MAX_IMAGE_BYTES = 4_000_000;

type Body = {
  tool?: unknown;
  model?: unknown;
  prompt?: unknown;
  size?: unknown;
  preset?: unknown;
  image?: unknown;
  /** Same photo under 512 px, for Cloudflare's FLUX.2 editing. */
  imageSmall?: unknown;
  /** Original photo size, so edits keep its shape. */
  imageWidth?: unknown;
  imageHeight?: unknown;
};

/** Output size for an edit: the photo's shape, about 1 megapixel, in steps of 16. */
function editSize(w: unknown, h: unknown) {
  const W = typeof w === "number" && w > 0 ? w : 1024;
  const H = typeof h === "number" && h > 0 ? h : 1024;
  const scale = Math.min(1920 / Math.max(W, H), Math.sqrt((1024 * 1024) / (W * H)));
  const r = (n: number) => Math.max(256, Math.min(1920, Math.round((n * scale) / 16) * 16));
  return { w: r(W), h: r(H) };
}

function fail(error: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

function dataUrlToBlob(v: unknown): Blob | null {
  if (typeof v !== "string") return null;
  const m = v.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
  return new Blob([bytes], { type: m[1] });
}

/** True when a PNG has an alpha channel (a real cutout), false for a black-and-white mask. */
function pngHasAlpha(bytes: Uint8Array) {
  return bytes.length > 26 && (bytes[25] === 6 || bytes[25] === 4);
}

function defaultModel(tool: Tool): string {
  if (tool === "photo") return CURATED.photo[0].id;
  if (tool === "edit") return CURATED.edit[0].id;
  if (tool === "video") return CURATED.video[0].id;
  if (tool === "animate") return CURATED.animate[0].id;
  if (tool === "upscale") return UPSCALE_MODELS[0];
  return CUTOUT_MODEL;
}

export async function POST(req: NextRequest) {
  const guard = await guardInference(clientIp(req.headers));
  if (!guard.ok) return fail(guard.error, guard.status);
  if (!guard.userId) return fail("Sign in to create.", 401);
  const userId = guard.userId;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("Something went wrong sending your request. Try again.", 400);
  }

  const tool = TOOLS.find((t) => t === body.tool);
  if (!tool) return fail("Pick what you want to create.", 400);

  const model = body.model === undefined || body.model === "" ? defaultModel(tool) : body.model;
  if (!validModelId(model)) return fail("Pick a model from the list.", 400);

  const rawPrompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (NEEDS_PROMPT.includes(tool) && !rawPrompt) return fail("Describe what you want first.", 400);

  const image = NEEDS_IMAGE.includes(tool) ? dataUrlToBlob(body.image) : null;
  if (NEEDS_IMAGE.includes(tool) && !image) return fail("Add a photo (JPG, PNG or WebP, under 4 MB).", 400);

  const size = isSize(body.size) ? body.size : tool === "video" || tool === "animate" ? "story" : "square";
  const kind: "photo" | "video" = tool === "video" || tool === "animate" ? "video" : "photo";
  const cost = costFor(tool, model);

  // Charge first so parallel requests can't overspend; refund if anything fails.
  let creditsLeft: number;
  try {
    creditsLeft = await spend(userId, cost, tool);
  } catch (e) {
    if (e instanceof CreditsError && e.code === "insufficient") {
      return fail(`You need ${cost} credits for this.`, 402, { code: "insufficient", cost });
    }
    return fail("Credits aren't available right now. Try again in a minute.", 503);
  }

  const english = rawPrompt ? await toEnglishPrompt(rawPrompt) : "";
  const styled = [english, presetSuffix(body.preset, kind)].filter(Boolean).join(", ");
  const dims = SIZES[size];
  const client = new InferenceClient(process.env.HF_TOKEN);

  try {
    let out: Blob;
    if (tool === "photo") {
      const hfPhoto = async (m: string) =>
        (await client.textToImage(
          { model: m, inputs: styled, provider: "auto", parameters: { width: dims.w, height: dims.h, image_size: dims.falPreset } },
          { outputType: "blob" },
        )) as Blob;
      let cf = CLOUDFLARE[model];
      // Flux Fast only makes squares; other sizes go to Flux 2 Klein on Cloudflare.
      if (cf?.squareOnly && size !== "square") cf = CLOUDFLARE["cloudflare/flux-2-klein-4b"];
      out = await firstOf([
        cf && cloudflareReady()
          ? () =>
              runCloudflareImage({
                model: cf.cf,
                multipart: cf.multipart,
                prompt: styled,
                width: dims.w,
                height: dims.h,
                steps: cf.cf.endsWith("flux-2-dev") ? 24 : undefined,
              })
          : null,
        () => hfPhoto(cf ? cf.hf : model),
        cf ? () => hfPhoto("black-forest-labs/FLUX.1-schnell") : null,
      ]);
    } else if (tool === "edit") {
      const cf = CLOUDFLARE[model];
      const small = dataUrlToBlob(body.imageSmall);
      const out_ = editSize(body.imageWidth, body.imageHeight);
      const hfEdit = (m: string) => client.imageToImage({ model: m, inputs: image!, provider: "auto", parameters: { prompt: styled } });
      out = await firstOf([
        cf?.edits && small && cloudflareReady()
          ? () =>
              runCloudflareImage({
                model: cf.cf,
                multipart: true,
                prompt: styled,
                image: small,
                width: out_.w,
                height: out_.h,
                steps: cf.cf.endsWith("flux-2-dev") ? 24 : undefined,
              })
          : null,
        () => hfEdit(cf ? cf.hf : model),
        cf ? () => hfEdit("Qwen/Qwen-Image-Edit-2509") : null,
      ]);
    } else if (tool === "upscale") {
      out = await firstOf(
        UPSCALE_MODELS.map((m) => () => client.imageToImage({ model: m, inputs: image!, provider: "auto", parameters: { prompt: UPSCALE_PROMPT } })),
      );
    } else if (tool === "video") {
      out = await client.textToVideo({
        model,
        inputs: styled,
        provider: "auto",
        parameters: { aspect_ratio: dims.ratio } as Record<string, unknown>,
      });
    } else if (tool === "animate") {
      out = await client.imageToVideo({
        model,
        inputs: image!,
        provider: "auto",
        parameters: { prompt: styled || "natural, subtle motion, cinematic", aspect_ratio: dims.ratio } as Record<string, unknown>,
      });
    } else {
      const segments = await client.imageSegmentation({ model: CUTOUT_MODEL, inputs: image!, provider: "auto" });
      const b64 = segments?.[0]?.mask;
      if (!b64) throw new Error("empty cutout");
      const bytes = Buffer.from(b64, "base64");
      if (!pngHasAlpha(bytes)) {
        // The provider sent a mask instead of a cutout: the browser combines it with the photo.
        return NextResponse.json({ mask: `data:image/png;base64,${b64}`, credits: creditsLeft, cost });
      }
      out = new Blob([bytes], { type: "image/png" });
    }

    const saved = await saveCreation(userId, out, { kind, tool, prompt: rawPrompt || undefined, model, size });
    if (!saved) {
      // Couldn't store it: still hand the file back so the work isn't lost.
      return new Response(out.stream(), {
        headers: { "content-type": out.type || (kind === "video" ? "video/mp4" : "image/png"), "x-credits": String(creditsLeft) },
      });
    }
    return NextResponse.json({ creation: saved, credits: creditsLeft, cost });
  } catch (e) {
    await refund(userId, cost, tool);
    const msg = e instanceof Error ? e.message : String(e);
    const notServed = /not supported|no provider|not found|404|model .* is not|unknown model/i.test(msg);
    return fail(
      notServed
        ? "This model isn't available right now. Pick another one. Your credits were returned."
        : "That didn't work this time. Your credits were returned. Try again.",
      502,
      { detail: msg.slice(0, 300), refunded: cost },
    );
  }
}

/** Tries each way to make the image in order and returns the first that works. */
async function firstOf(attempts: (null | undefined | false | (() => Promise<Blob>))[]): Promise<Blob> {
  let last: unknown;
  for (const run of attempts) {
    if (!run) continue;
    try {
      return await run();
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("No model worked");
}
