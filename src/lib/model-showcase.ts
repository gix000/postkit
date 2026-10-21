import { costFor, modelEnabled, type Text, type Tool } from "./catalog";

export type ShowTab = "photo" | "edit" | "video" | "tools";

export type ShowCard = {
  key: string;
  tab: ShowTab;
  name: string;
  badge?: Text;
  bestFor: Text;
  seconds: number;
  credits: number;
  media: string;
  video?: string;
  /** Shown small in the corner of edit cards: the photo that went in. */
  before?: string;
  href: string;
};

type Def = Omit<ShowCard, "credits" | "href"> & { tool: Tool; model?: string; mode: string };

/** Every sample was made by that exact model (tests run on PostKit, Oct 2026). */
const DEFS: Def[] = [
  // Photo
  { key: "klein", tab: "photo", tool: "photo", mode: "photo", model: "cloudflare/flux-2-klein-4b", name: "Flux 2 Klein", badge: { en: "Best value", ar: "الأوفر" }, bestFor: { en: "Sharp everyday photos, any size", ar: "صور يومية حادة بكل المقاسات" }, seconds: 5, media: "/showcase/perfume.webp" },
  { key: "fast", tab: "photo", tool: "photo", mode: "photo", model: "cloudflare/flux-1-schnell", name: "Flux Fast", badge: { en: "Fastest", ar: "الأسرع" }, bestFor: { en: "Quick ideas and food shots", ar: "أفكار سريعة وصور الطعام" }, seconds: 3, media: "/models/flux-fast.webp" },
  { key: "z", tab: "photo", tool: "photo", mode: "photo", model: "runpod/z-image-turbo", name: "Z Photoreal", bestFor: { en: "Real-looking products and people", ar: "منتجات وأشخاص بمظهر حقيقي" }, seconds: 6, media: "/models/z-photoreal.webp" },
  { key: "pruna", tab: "photo", tool: "photo", mode: "photo", model: "runpod/p-image-t2i", name: "Pruna Instant", bestFor: { en: "Improves short prompts for you", ar: "يحسّن الأوصاف القصيرة تلقائيًا" }, seconds: 4, media: "/models/pruna-instant.webp" },
  { key: "qwen", tab: "photo", tool: "photo", mode: "photo", model: "runpod/qwen-image-t2i", name: "Qwen Poster", badge: { en: "Best for text", ar: "الأفضل للنصوص" }, bestFor: { en: "Signs, posters and logos with words", ar: "لافتات وملصقات وشعارات بنصوص" }, seconds: 18, media: "/models/qwen-poster.webp" },
  { key: "seedream", tab: "photo", tool: "photo", mode: "photo", model: "runpod/seedream-v4-t2i", name: "Seedream 2K", badge: { en: "2K", ar: "2K" }, bestFor: { en: "Magazine-grade detail for ads", ar: "تفاصيل بمستوى المجلات للإعلانات" }, seconds: 40, media: "/models/seedream.webp" },
  // Edit your photo
  { key: "qwen-edit", tab: "edit", tool: "edit", mode: "photo", model: "runpod/qwen-image-edit-2511", name: "Qwen Edit", badge: { en: "Most faithful", ar: "الأدق" }, bestFor: { en: "New scene, same product", ar: "مشهد جديد بنفس المنتج" }, seconds: 11, media: "/models/qwen-edit.webp", before: "/models/edit-before.webp" },
  { key: "pruna-edit", tab: "edit", tool: "edit", mode: "photo", model: "runpod/p-image-edit", name: "Pruna Edit", bestFor: { en: "Quick restyles and swaps", ar: "تغيير سريع للأسلوب والعناصر" }, seconds: 5, media: "/models/pruna-edit.webp", before: "/models/edit-before.webp" },
  { key: "seedream-edit", tab: "edit", tool: "edit", mode: "photo", model: "runpod/seedream-v4-edit", name: "Seedream Edit", badge: { en: "2K", ar: "2K" }, bestFor: { en: "High-res edits for print and ads", ar: "تعديلات عالية الدقة للطباعة والإعلانات" }, seconds: 11, media: "/models/seedream-edit.webp", before: "/models/edit-before.webp" },
  // Video
  { key: "pvideo", tab: "video", tool: "video", mode: "video", model: "runpod/p-video", name: "Pruna Video", badge: { en: "Fastest", ar: "الأسرع" }, bestFor: { en: "5-second clips from a sentence", ar: "مقاطع 5 ثوانٍ من جملة" }, seconds: 10, media: "/models/pruna-video.webp", video: "/models/pruna-video.mp4" },
  { key: "wan26", tab: "video", tool: "video", mode: "video", model: "runpod/wan-2-6-t2v", name: "Wan Cinematic", badge: { en: "Cinematic", ar: "سينمائي" }, bestFor: { en: "Film-like camera moves, 720p", ar: "حركة كاميرا سينمائية بدقة 720p" }, seconds: 65, media: "/models/wan-cinematic.webp", video: "/models/wan-cinematic.mp4" },
  { key: "pmotion", tab: "video", tool: "animate", mode: "animate", model: "runpod/p-video", name: "Pruna Motion", bestFor: { en: "Bring your photo to life", ar: "حرّك صورتك" }, seconds: 12, media: "/models/pruna-motion.webp", video: "/models/pruna-motion.mp4" },
  { key: "wan22", tab: "video", tool: "animate", mode: "animate", model: "runpod/wan-2-2-i2v-720", name: "Wan Motion", bestFor: { en: "Natural movement from a photo", ar: "حركة طبيعية من صورة" }, seconds: 150, media: "/models/wan-motion.webp", video: "/models/wan-motion.mp4" },
  // One-tap tools
  { key: "cutout", tab: "tools", tool: "cutout", mode: "photo", name: "Remove background", badge: { en: "Transparent PNG", ar: "PNG شفاف" }, bestFor: { en: "Clean product cutouts in one tap", ar: "قص المنتج بنقرة واحدة" }, seconds: 8, media: "/models/cutout.webp" },
  { key: "upscale", tab: "tools", tool: "upscale", mode: "photo", name: "Upscale 4×", badge: { en: "Before / after", ar: "قبل / بعد" }, bestFor: { en: "Sharper, bigger photos for print", ar: "صور أكبر وأوضح للطباعة" }, seconds: 5, media: "/models/upscale.webp" },
];

export function showcaseCards(): ShowCard[] {
  return DEFS.filter((d) => !d.model || modelEnabled(d.model)).map(({ tool, model, mode, ...d }) => {
    const p = new URLSearchParams({ mode });
    if (model) p.set("model", model);
    return { ...d, credits: costFor(tool, model), href: `/create?${p}` };
  });
}
