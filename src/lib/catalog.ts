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

export type ModelPick = { id: string; name: string; note: Text; cheap?: boolean };

export const CURATED: Record<Kind, ModelPick[]> = {
  photo: [
    {
      id: "black-forest-labs/FLUX.1-schnell",
      name: "Flux Fast",
      note: { en: "Quick, sharp, great all-round", ar: "سريع وحاد ومناسب لكل شيء" },
      cheap: true,
    },
    {
      id: "Tongyi-MAI/Z-Image-Turbo",
      name: "Z Photoreal",
      note: { en: "Realistic photos in seconds", ar: "صور واقعية خلال ثوانٍ" },
      cheap: true,
    },
    {
      id: "Qwen/Qwen-Image",
      name: "Qwen Poster",
      note: { en: "Best with text, posters and signs", ar: "الأفضل للنصوص والملصقات واللافتات" },
    },
    {
      id: "black-forest-labs/FLUX.1-dev",
      name: "Flux Pro",
      note: { en: "More detail, a little slower", ar: "تفاصيل أكثر، وأبطأ قليلًا" },
    },
  ],
  edit: [
    {
      id: "Qwen/Qwen-Image-Edit-2509",
      name: "Qwen Edit",
      note: { en: "Follows instructions, keeps faces", ar: "ينفّذ التعليمات ويحافظ على الوجوه" },
    },
    {
      id: "black-forest-labs/FLUX.1-Kontext-dev",
      name: "Flux Kontext",
      note: { en: "Restyle, relight, change the scene", ar: "غيّر الأسلوب والإضاءة والمشهد" },
    },
  ],
  video: [
    {
      id: "Wan-AI/Wan2.2-T2V-A14B",
      name: "Wan Cinematic",
      note: { en: "Smooth, film-like motion", ar: "حركة سلسة بطابع سينمائي" },
    },
    {
      id: "Wan-AI/Wan2.2-TI2V-5B",
      name: "Wan Quick",
      note: { en: "Short clips, faster results", ar: "مقاطع قصيرة ونتائج أسرع" },
    },
    {
      id: "Wan-AI/Wan2.1-T2V-14B",
      name: "Wan Classic",
      note: { en: "Detailed scenes, steady camera", ar: "مشاهد مفصّلة وكاميرا ثابتة" },
    },
  ],
  animate: [
    {
      id: "Wan-AI/Wan2.2-I2V-A14B",
      name: "Wan Motion",
      note: { en: "Natural movement from your photo", ar: "حركة طبيعية من صورتك" },
    },
    {
      id: "Wan-AI/Wan2.1-I2V-14B-720P",
      name: "Wan HD",
      note: { en: "Sharper 720p clips", ar: "مقاطع أوضح بدقة 720p" },
    },
    {
      id: "Lightricks/LTX-2",
      name: "LTX",
      note: { en: "Fast and lively", ar: "سريع ومليء بالحيوية" },
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
  if (tool === "photo" && model && CURATED.photo.some((p) => p.id === model && p.cheap)) return 1;
  return COST[tool];
}

export type SizeId = "square" | "portrait" | "story" | "wide";
export const SIZES: Record<SizeId, { label: Text; ratio: string; w: number; h: number; falPreset: string }> = {
  square: { label: { en: "Square", ar: "مربع" }, ratio: "1:1", w: 1024, h: 1024, falPreset: "square_hd" },
  portrait: { label: { en: "Post", ar: "منشور" }, ratio: "4:5", w: 896, h: 1152, falPreset: "portrait_4_3" },
  story: { label: { en: "Story", ar: "ستوري" }, ratio: "9:16", w: 768, h: 1344, falPreset: "portrait_16_9" },
  wide: { label: { en: "Wide", ar: "عريض" }, ratio: "16:9", w: 1344, h: 768, falPreset: "landscape_16_9" },
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
