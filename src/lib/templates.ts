import type { SizeId, Text } from "./catalog";

export type TemplateCategory = "food" | "products" | "realestate" | "social";

export type Template = {
  id: string;
  category: TemplateCategory;
  name: Text;
  blurb: Text;
  /** "photo" = customer uploads their photo first; "text" = they only edit the words. */
  needs: "photo" | "text";
  mode: "photo" | "video";
  model: string;
  size: SizeId;
  prompt: string;
  /** Short tip shown on Create while the template is active. */
  tip: Text;
  cover: string;
  before?: string;
  video?: string;
};

export const CATEGORIES: { id: TemplateCategory; name: Text }[] = [
  { id: "food", name: { en: "Food & menus", ar: "طعام وقوائم" } },
  { id: "products", name: { en: "Products", ar: "منتجات" } },
  { id: "realestate", name: { en: "Real estate", ar: "عقارات" } },
  { id: "social", name: { en: "Social & promos", ar: "سوشيال وعروض" } },
];

const QWEN_EDIT = "runpod/qwen-image-edit-2511";
const KEEP: Text = { en: "Upload a clear photo of your item. PostKit keeps it the same and rebuilds everything around it.", ar: "ارفع صورة واضحة لمنتجك. PostKit يحافظ عليه ويعيد بناء كل ما حوله." };

/** Covers were made with these templates on phone-style sample photos (Oct 2026). */
export const TEMPLATES: Template[] = [
  {
    id: "menu-dish", category: "food", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "square",
    name: { en: "Menu photo", ar: "صورة للقائمة" },
    blurb: { en: "Turn a phone snap of a dish into a clean menu shot.", ar: "حوّل صورة طبق من الهاتف إلى صورة قائمة احترافية." },
    prompt: "Turn this into a professional restaurant menu photo: the same dish on a clean light stone surface, soft natural top light, fresh garnish, appetizing and sharp, shallow depth of field. Keep the food exactly the same. No text.",
    tip: KEEP, cover: "/templates/menu-dish.webp", before: "/templates/menu-dish-before.webp",
  },
  {
    id: "burger-ad", category: "food", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Burger & food ad", ar: "إعلان برغر وطعام" },
    blurb: { en: "Flying ingredients, neon rim lights, pure hype.", ar: "مكونات طائرة وإضاءة نيون تخطف الأنظار." },
    prompt: "Advertising shot of this food floating on a black background, fresh ingredients and sesame seeds flying around it, lime green and hot pink rim lights, dramatic and ultra sharp. Keep the food the same. No text.",
    tip: KEEP, cover: "/templates/burger-ad.webp", before: "/templates/burger-ad-before.webp",
  },
  {
    id: "cafe-drink", category: "food", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Café drink", ar: "مشروب المقهى" },
    blurb: { en: "Your drink on a sunny marble table, ready to post.", ar: "مشروبك على طاولة رخام مشمسة، جاهز للنشر." },
    prompt: "Place this drink on a marble cafe table by a sunny window, morning light, condensation drops, softly blurred cozy cafe background, lifestyle photo. Keep the drink and cup the same. No text.",
    tip: KEEP, cover: "/templates/cafe-drink.webp", before: "/templates/cafe-drink-before.webp",
  },
  {
    id: "white-studio", category: "products", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "square",
    name: { en: "Clean white background", ar: "خلفية بيضاء نظيفة" },
    blurb: { en: "Catalog-ready product shots for your online store.", ar: "صور منتجات جاهزة لمتجرك الإلكتروني." },
    prompt: "Put this product on a pure white seamless studio background with a soft natural shadow, e-commerce catalog photo, even lighting. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/white-studio.webp", before: "/templates/white-studio-before.webp",
  },
  {
    id: "luxury-podium", category: "products", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Luxury podium", ar: "منصة فاخرة" },
    blurb: { en: "Stone podium, soft shadows, premium beauty look.", ar: "منصة حجرية وظلال ناعمة بطابع فاخر." },
    prompt: "Place this product on a travertine stone podium against a soft beige backdrop with palm leaf shadows, luxury cosmetics advertising photo, warm light. Keep the product the same. No text.",
    tip: KEEP, cover: "/templates/luxury-podium.webp", before: "/templates/luxury-podium-before.webp",
  },
  {
    id: "neon-ad", category: "products", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Neon tech ad", ar: "إعلان نيون" },
    blurb: { en: "Glossy black, lime and pink light. Made for tech.", ar: "أسود لامع وإضاءة خضراء وزهرية للتقنية." },
    prompt: "Dramatic advertising photo of this product on a glossy black surface with lime green and hot pink neon light reflections, light haze, high contrast. Keep the product the same. No text.",
    tip: KEEP, cover: "/templates/neon-ad.webp", before: "/templates/neon-ad-before.webp",
  },
  {
    id: "bright-listing", category: "realestate", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "wide",
    name: { en: "Bright listing photo", ar: "صورة عقار مشرقة" },
    blurb: { en: "Dim room to bright, straight, inviting listing.", ar: "من غرفة معتمة إلى صورة عقار مشرقة وجذابة." },
    prompt: "Professional real estate photo of this room: bright natural daylight, clear windows, straight vertical lines, clean and tidy, warm inviting tones. Keep the room layout, walls and furniture the same.",
    tip: { en: "Upload a photo of the room. Walls, windows and furniture stay where they are.", ar: "ارفع صورة الغرفة. الجدران والنوافذ والأثاث تبقى كما هي." },
    cover: "/templates/bright-listing.webp", before: "/templates/bright-listing-before.webp",
  },
  {
    id: "staging", category: "realestate", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "wide",
    name: { en: "Virtual staging", ar: "تأثيث افتراضي" },
    blurb: { en: "Furnish an empty room in seconds.", ar: "أثّث غرفة فارغة خلال ثوانٍ." },
    prompt: "Furnish this empty room in a modern minimal style: a light linen sofa, a round rug, a wooden coffee table, plants and warm lamps. Keep the walls, window and floor exactly the same. Real estate photo.",
    tip: { en: "Upload an empty room. Change the style words in the description if you like (boho, classic, Scandinavian).", ar: "ارفع غرفة فارغة. يمكنك تغيير كلمات الأسلوب في الوصف (بوهو، كلاسيكي، اسكندنافي)." },
    cover: "/templates/staging.webp", before: "/templates/staging-before.webp",
  },
  {
    id: "in-hand", category: "social", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Product in hand", ar: "المنتج في اليد" },
    blurb: { en: "Bright pastel wall, hard sun. Instant Instagram.", ar: "جدار باستيل وشمس قوية. جاهز لإنستغرام." },
    prompt: "Stylish social media photo of this product held in a hand against a colorful pastel wall with hard sunlight shadows, trendy and bright. Keep the product the same. No text.",
    tip: KEEP, cover: "/templates/in-hand.webp", before: "/templates/in-hand-before.webp",
  },
  {
    id: "flat-lay", category: "social", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "square",
    name: { en: "Styled flat lay", ar: "تنسيق من الأعلى" },
    blurb: { en: "Overhead styling with flowers and props.", ar: "تنسيق علوي مع ورود وإكسسوارات." },
    prompt: "Overhead flat lay of this product on a styled pink table with matching props, fresh flowers and silk fabric, soft daylight, Instagram aesthetic. Keep the product the same. No text.",
    tip: KEEP, cover: "/templates/flat-lay.webp", before: "/templates/flat-lay-before.webp",
  },
  {
    id: "photo-video", category: "social", needs: "photo", mode: "video", model: "runpod/p-video", size: "story",
    name: { en: "Photo to video", ar: "من صورة إلى فيديو" },
    blurb: { en: "A 5-second reel from any product photo.", ar: "ريل 5 ثوانٍ من أي صورة منتج." },
    prompt: "Slow cinematic camera push-in around the product, soft light shifting, subtle natural motion, premium commercial feel",
    tip: { en: "Upload your best photo. Describe the motion you want, or keep ours.", ar: "ارفع أفضل صورة لديك. صِف الحركة التي تريدها أو اترك وصفنا." },
    cover: "/templates/photo-video.webp", before: "/templates/photo-video-before.webp", video: "/templates/photo-video.mp4",
  },
  {
    id: "event-poster", category: "social", needs: "text", mode: "photo", model: "runpod/qwen-image-t2i", size: "portrait",
    name: { en: "Event poster", ar: "ملصق حدث" },
    blurb: { en: "Neon poster with your event name and date.", ar: "ملصق نيون باسم الحدث وتاريخه." },
    prompt: 'Modern event poster with the big title "SUMMER NIGHT" and smaller text "Saturday 9 PM · Beirut", glowing lime green and hot pink neon lines, silhouettes of a dancing crowd, dark background, clean bold typography',
    tip: { en: "Change the words in quotes to your event name, day and place. Keep them short.", ar: "غيّر الكلمات بين علامتي التنصيص إلى اسم حدثك واليوم والمكان. اجعلها قصيرة." },
    cover: "/templates/event-poster.webp",
  },
  {
    id: "sale-post", category: "social", needs: "text", mode: "photo", model: "runpod/qwen-image-t2i", size: "square",
    name: { en: "Sale post", ar: "منشور تخفيضات" },
    blurb: { en: "Bold discount post with your offer.", ar: "منشور تخفيضات جريء بعرضك." },
    prompt: 'Bold Instagram sale post with the big text "50% OFF" and smaller text "This weekend only", clean modern layout, lime green and black colors, shopping bags and a product box, studio lighting',
    tip: { en: "Change the words in quotes to your offer. Short words come out sharpest.", ar: "غيّر الكلمات بين علامتي التنصيص إلى عرضك. الكلمات القصيرة تظهر أوضح." },
    cover: "/templates/sale-post.webp",
  },
];

export function getTemplate(id?: string | null) {
  return id ? TEMPLATES.find((t) => t.id === id) : undefined;
}

export function templateHref(t: Template) {
  const p = new URLSearchParams({ template: t.id });
  return `/create?${p}`;
}
