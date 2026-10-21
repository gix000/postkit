/**
 * Everything people can make, what it costs in credits, and the packs they buy.
 * Shared by the browser (to show prices) and the server (to charge them).
 * The server never trusts a price sent from the browser; it reads this file.
 */

export type Lang = "en" | "ar";
export type Text = Record<Lang, string>;

/** What the model picker can show. */
export type Kind = "photo" | "edit" | "video" | "animate" | "chat";
/** What a generation charges for. */
export type Tool = "photo" | "edit" | "video" | "animate" | "upscale" | "cutout";

export type ModelPick = { id: string; name: string; note: Text; cheap?: boolean; cost?: number };

/**
 * Flux models that run on Cloudflare Workers AI (free daily allowance, then ~$0.0006 a photo).
 * Ids look like "cloudflare/<model>". If Cloudflare is busy or the allowance is used up,
 * the same model runs on Hugging Face instead (hf), then a safe default.
 */
export const CLOUDFLARE: Record<string, { cf: string; hf: string; multipart: boolean; squareOnly?: boolean; edits: boolean; paid?: boolean }> = {
  "cloudflare/flux-2-klein-4b": { cf: "@cf/black-forest-labs/flux-2-klein-4b", hf: "black-forest-labs/FLUX.2-klein-4B", multipart: true, edits: true },
  "cloudflare/flux-1-schnell": { cf: "@cf/black-forest-labs/flux-1-schnell", hf: "black-forest-labs/FLUX.1-schnell", multipart: false, squareOnly: true, edits: false },
  "cloudflare/flux-2-klein-9b": { cf: "@cf/black-forest-labs/flux-2-klein-9b", hf: "black-forest-labs/FLUX.2-klein-9B", multipart: true, edits: true, paid: true },
  "cloudflare/flux-2-dev": { cf: "@cf/black-forest-labs/flux-2-dev", hf: "black-forest-labs/FLUX.2-dev", multipart: true, edits: true, paid: true },
};

/**
 * What's switched on. Klein Plus (~1,360 neurons a photo) and Pro (~3,600) would use up
 * Cloudflare's free 10,000 a day in a handful of photos, so they only show on the paid plan.
 * Hugging Face models only show once a token is added.
 */
export const ENABLED = {
  cloudflarePaid: process.env.NEXT_PUBLIC_CLOUDFLARE_PAID === "1",
  huggingface: process.env.NEXT_PUBLIC_HF_READY === "1",
  runpod: process.env.NEXT_PUBLIC_RUNPOD_READY === "1",
};

/** Hosted models on Runpod Public Endpoints, billed per result. Ids look like "runpod/<endpoint>". */
export const RUNPOD_PREFIX = "runpod/";
export const isRunpod = (id: string) => id.startsWith(RUNPOD_PREFIX);

/** True when this model can actually run with what's switched on. */
export function modelEnabled(id: string) {
  const cf = CLOUDFLARE[id];
  if (cf) return !cf.paid || ENABLED.cloudflarePaid;
  if (isRunpod(id)) return ENABLED.runpod;
  return ENABLED.huggingface;
}

const ALL_CURATED: Record<Kind, ModelPick[]> = {
  photo: [
    {
      id: "cloudflare/flux-2-klein-4b",
      name: "Flux 2 Klein",
      note: { en: "Fast and sharp, every size", ar: "سريع وحاد، بكل المقاسات" },
      cheap: true,
    },
    {
      id: "cloudflare/flux-1-schnell",
      name: "Flux Fast",
      note: { en: "Quickest, great all-round", ar: "الأسرع، ومناسب لكل شيء" },
      cheap: true,
    },
    {
      id: "runpod/z-image-turbo",
      name: "Z Photoreal",
      note: { en: "Realistic photos in seconds", ar: "صور واقعية خلال ثوانٍ" },
      cost: 2,
    },
    {
      id: "runpod/p-image-t2i",
      name: "Pruna Instant",
      note: { en: "Improves your prompt for you", ar: "يحسّن وصفك تلقائيًا" },
      cost: 2,
    },
    {
      id: "runpod/qwen-image-t2i",
      name: "Qwen Poster",
      note: { en: "Best with text, posters and signs", ar: "الأفضل للنصوص والملصقات واللافتات" },
      cost: 2,
    },
    {
      id: "runpod/seedream-v4-t2i",
      name: "Seedream 2K",
      note: { en: "Magazine quality, extra sharp", ar: "جودة مجلات وحدّة عالية" },
      cost: 3,
    },
    {
      id: "cloudflare/flux-2-klein-9b",
      name: "Flux 2 Klein Plus",
      note: { en: "More detail and better text", ar: "تفاصيل أكثر ونصوص أوضح" },
      cost: 2,
    },
    {
      id: "cloudflare/flux-2-dev",
      name: "Flux 2 Pro",
      note: { en: "Best Flux quality, a little slower", ar: "أفضل جودة Flux، أبطأ قليلًا" },
      cost: 3,
    },
  ],
  edit: [
    {
      id: "cloudflare/flux-2-klein-4b",
      name: "Flux 2 Klein Edit",
      note: { en: "Fast edits, keeps your product", ar: "تعديل سريع يحافظ على منتجك" },
      cost: 2,
    },
    {
      id: "runpod/qwen-image-edit-2511",
      name: "Qwen Edit",
      note: { en: "Follows instructions, keeps faces", ar: "ينفّذ التعليمات ويحافظ على الوجوه" },
      cost: 3,
    },
    {
      id: "runpod/p-image-edit",
      name: "Pruna Edit",
      note: { en: "Quick restyles and swaps", ar: "تغيير سريع للأسلوب والعناصر" },
      cost: 3,
    },
    {
      id: "runpod/seedream-v4-edit",
      name: "Seedream Edit",
      note: { en: "Sharp 2K edits, keeps your product", ar: "تعديل 2K حاد يحافظ على منتجك" },
      cost: 3,
    },
    {
      id: "cloudflare/flux-2-klein-9b",
      name: "Flux 2 Klein Plus Edit",
      note: { en: "Cleaner detail on faces and text", ar: "تفاصيل أنظف للوجوه والنصوص" },
      cost: 3,
    },
    {
      id: "cloudflare/flux-2-dev",
      name: "Flux 2 Pro Edit",
      note: { en: "Best Flux edits, a little slower", ar: "أفضل تعديل Flux، أبطأ قليلًا" },
      cost: 4,
    },
  ],
  video: [
    {
      id: "runpod/p-video",
      name: "Pruna Video",
      note: { en: "5-second clips in seconds", ar: "مقاطع 5 ثوانٍ خلال لحظات" },
      cost: 10,
    },
    {
      id: "runpod/wan-2-6-t2v",
      name: "Wan Cinematic",
      note: { en: "Film-like motion, 720p", ar: "حركة سينمائية بدقة 720p" },
      cost: 25,
    },
  ],
  animate: [
    {
      id: "runpod/p-video",
      name: "Pruna Motion",
      note: { en: "Brings your photo to life fast", ar: "يحرّك صورتك بسرعة" },
      cost: 10,
    },
    {
      id: "runpod/wan-2-2-i2v-720",
      name: "Wan Motion",
      note: { en: "Natural movement, 720p", ar: "حركة طبيعية بدقة 720p" },
      cost: 15,
    },
  ],
  chat: [
    {
      id: "Qwen/Qwen2.5-72B-Instruct",
      name: "Qwen Smart",
      note: { en: "Deep answers, great Arabic", ar: "إجابات معمّقة وعربية ممتازة" },
    },
    {
      id: "meta-llama/Llama-3.1-8B-Instruct",
      name: "Llama Quick",
      note: { en: "Fast everyday answers", ar: "إجابات يومية سريعة" },
    },
    {
      id: "mistralai/Mistral-7B-Instruct-v0.3",
      name: "Mistral Light",
      note: { en: "Short and snappy", ar: "قصير ومباشر" },
    },
  ],
};

/** The models people can pick, minus anything not switched on (each list keeps at least its first model). */
export const CURATED = Object.fromEntries(
  (Object.entries(ALL_CURATED) as [Kind, ModelPick[]][]).map(([k, list]) => {
    const on = list.filter((m) => modelEnabled(m.id));
    return [k, on.length ? on : list];
  }),
) as Record<Kind, ModelPick[]>;

/** Hub task each picker searches when people open "More models". */
export const KIND_TASK: Record<Kind, string> = {
  photo: "text-to-image",
  edit: "image-to-image",
  video: "text-to-video",
  animate: "image-to-video",
  chat: "text-generation",
};

/** Upscaling tries the dedicated upscaler first, then the general editor. */
export const UPSCALE_MODELS = ["joyfox/Qwen-Image-Edit-2509-Upscale2K", "Qwen/Qwen-Image-Edit-2509"];
export const UPSCALE_PROMPT =
  "Upscale this image to high resolution. Sharpen fine details and textures, remove noise and blur. Keep the content, colors and composition exactly the same.";
export const CUTOUT_MODEL = "briaai/RMBG-2.0";

/** Credits per creation. 1 credit is sold at about 4–5¢; see /credits. */
export const COST: Record<Tool, number> = { photo: 2, edit: 3, video: 15, animate: 15, upscale: 3, cutout: 2 };

export function costFor(tool: Tool, model?: string): number {
  const kind = tool === "photo" || tool === "edit" || tool === "video" || tool === "animate" ? tool : null;
  const pick = kind && model ? CURATED[kind].find((p) => p.id === model) : undefined;
  if (pick?.cost) return pick.cost;
  if (tool === "photo" && pick?.cheap) return 1;
  return COST[tool];
}

export type SizeId = "square" | "portrait" | "story" | "wide";
export const SIZES: Record<SizeId, { label: Text; ratio: string; w: number; h: number; falPreset: string }> = {
  square: { label: { en: "Square", ar: "مربع" }, ratio: "1:1", w: 1024, h: 1024, falPreset: "square_hd" },
  portrait: { label: { en: "Post", ar: "منشور" }, ratio: "4:5", w: 816, h: 1024, falPreset: "portrait_4_3" },
  story: { label: { en: "Story", ar: "ستوري" }, ratio: "9:16", w: 576, h: 1024, falPreset: "portrait_16_9" },
  wide: { label: { en: "Wide", ar: "عريض" }, ratio: "16:9", w: 1024, h: 576, falPreset: "landscape_16_9" },
};
export const PHOTO_SIZES: SizeId[] = ["square", "portrait", "story", "wide"];
export const VIDEO_SIZES: SizeId[] = ["story", "wide", "square"];

export function isSize(v: unknown): v is SizeId {
  return typeof v === "string" && v in SIZES;
}

export type PresetId = "none" | "product" | "food" | "social" | "interior" | "cinematic" | "illustration";
export const PRESETS: { id: PresetId; label: Text; photo: string; video: string }[] = [
  { id: "none", label: { en: "No style", ar: "بدون نمط" }, photo: "", video: "" },
  {
    id: "product",
    label: { en: "Product shot", ar: "صورة منتج" },
    photo: "professional product photography, clean studio background, soft shadows, crisp focus, commercial lighting",
    video: "slow 360-degree product turn, clean studio background, soft commercial lighting",
  },
  {
    id: "food",
    label: { en: "Menu & food", ar: "طعام وقائمة" },
    photo: "appetizing food photography, natural window light, shallow depth of field, restaurant menu style",
    video: "slow appetizing close-up, gentle steam, shallow depth of field",
  },
  {
    id: "social",
    label: { en: "Social ad", ar: "إعلان سوشيال" },
    photo: "bold eye-catching composition, vibrant colors, social media advertising style",
    video: "dynamic vertical reel, energetic camera move, vibrant colors",
  },
  {
    id: "interior",
    label: { en: "Interior", ar: "تصميم داخلي" },
    photo: "architectural interior photography, wide angle, bright natural light, design magazine quality",
    video: "smooth walkthrough camera move, architectural interior, bright natural light",
  },
  {
    id: "cinematic",
    label: { en: "Cinematic", ar: "سينمائي" },
    photo: "cinematic film still, dramatic lighting, 35mm, rich color grade",
    video: "cinematic camera movement, dramatic lighting, film grain",
  },
  {
    id: "illustration",
    label: { en: "Illustration", ar: "رسم توضيحي" },
    photo: "flat vector illustration, clean shapes, bold colors",
    video: "2D animated illustration style, clean shapes, bold colors",
  },
];

export function presetSuffix(id: unknown, kind: "photo" | "video"): string {
  const p = PRESETS.find((x) => x.id === id);
  return p ? p[kind] : "";
}

export type PackId = "starter" | "creator" | "pro";
export const PACKS: Record<PackId, { credits: number; usd: number; label: Text; note: Text }> = {
  starter: {
    credits: 100,
    usd: 5,
    label: { en: "Starter", ar: "البداية" },
    note: { en: "About 100 photos or 6 videos", ar: "نحو 100 صورة أو 6 فيديوهات" },
  },
  creator: {
    credits: 330,
    usd: 15,
    label: { en: "Creator", ar: "المبدع" },
    note: { en: "Best value for regular posting", ar: "أفضل قيمة للنشر المنتظم" },
  },
  pro: {
    credits: 900,
    usd: 39,
    label: { en: "Pro", ar: "المحترف" },
    note: { en: "For businesses and agencies", ar: "للشركات والوكالات" },
  },
};

export function isPack(v: unknown): v is PackId {
  return typeof v === "string" && v in PACKS;
}

export const WELCOME_CREDITS = 10;
