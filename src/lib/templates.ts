import type { SizeId, Text } from "./catalog";

export type TemplateCategory = "occasions" | "food" | "products" | "realestate" | "social";

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
  /** Occasion templates: which date to count down to (see OCCASION_DATES). */
  occasion?: string;
};

export const CATEGORIES: { id: TemplateCategory; name: Text }[] = [
  { id: "occasions", name: { en: "Occasions", ar: "مناسبات" } },
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
    id: "occ-ramadan", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Ramadan", ar: "رمضان" },
    blurb: { en: "Lanterns, dates and golden candlelight.", ar: "فوانيس وتمر وضوء ذهبي دافئ." },
    prompt: "Place this product on a table with glowing Ramadan lanterns, a bowl of dates and a small crescent moon ornament, warm golden candlelight against a deep navy evening backdrop, festive and elegant advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-ramadan.webp", before: "/templates/white-studio-before.webp", occasion: "ramadan",
  },
  {
    id: "occ-eid", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Eid", ar: "العيد" },
    blurb: { en: "Gifts, ma'amoul and gold confetti.", ar: "هدايا ومعمول وقصاصات ذهبية." },
    prompt: "Place this product among elegant Eid gifts: pastel gift boxes with gold ribbons, ma'amoul cookies on a brass tray, scattered gold confetti, soft warm light, joyful and refined advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-eid.webp", before: "/templates/white-studio-before.webp", occasion: "eid",
  },
  {
    id: "occ-christmas", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Christmas", ar: "الميلاد" },
    blurb: { en: "Pine, ornaments and warm fairy lights.", ar: "صنوبر وزينة وأضواء دافئة." },
    prompt: "Place this product in a cozy Christmas scene: pine branches, red and gold ornaments, warm fairy-light bokeh, a soft dusting of snow, festive and warm advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-christmas.webp", before: "/templates/white-studio-before.webp", occasion: "christmas",
  },
  {
    id: "occ-new-year", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "New Year", ar: "رأس السنة" },
    blurb: { en: "Confetti, champagne and sparkle.", ar: "قصاصات وشمبانيا ولمعان." },
    prompt: "Place this product in a New Year's Eve celebration: gold and silver confetti, two champagne glasses, sparkling bokeh lights on a midnight-blue backdrop, glamorous advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-new-year.webp", before: "/templates/white-studio-before.webp", occasion: "new-year",
  },
  {
    id: "occ-valentine", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Valentine's", ar: "عيد الحب" },
    blurb: { en: "Red roses, petals and soft pink light.", ar: "ورود حمراء وبتلات وضوء وردي." },
    prompt: "Place this product on soft pink silk surrounded by red roses and scattered rose petals, romantic pink light with heart-shaped bokeh, Valentine's Day advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-valentine.webp", before: "/templates/white-studio-before.webp", occasion: "valentine",
  },
  {
    id: "occ-mothers-day", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Mother's Day", ar: "عيد الأم" },
    blurb: { en: "Spring tulips and gentle morning light.", ar: "توليب ربيعي وضوء صباحي ناعم." },
    prompt: "Place this product among fresh pastel tulips and baby's breath flowers on a white linen table by a bright window, soft spring morning light, gentle and loving mood, clean advertising photo. Absolutely no words, letters, signs or cards anywhere. Keep the product exactly the same.",
    tip: KEEP, cover: "/templates/occ-mothers-day.webp", before: "/templates/white-studio-before.webp", occasion: "mothers-day",
  },
  {
    id: "occ-independence", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Independence Day", ar: "عيد الاستقلال" },
    blurb: { en: "Red and white with a cedar branch.", ar: "أحمر وأبيض مع غصن أرز." },
    prompt: "Place this product on a white marble surface beside a small green cedar branch, with red and white ribbons and soft red-and-white bokeh lights, elegant Lebanese Independence Day advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-independence.webp", before: "/templates/white-studio-before.webp", occasion: "independence",
  },
  {
    id: "occ-black-friday", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Black Friday", ar: "الجمعة السوداء" },
    blurb: { en: "Black, neon lime and shopping bags.", ar: "أسود ونيون أخضر وأكياس تسوّق." },
    prompt: "Place this product on a matte black surface with bold neon lime-green light strips behind it and plain black shopping bags without any print, dramatic high-contrast sale-season advertising photo. Absolutely no words, letters, numbers or logos anywhere. Keep the product exactly the same.",
    tip: KEEP, cover: "/templates/occ-black-friday.webp", before: "/templates/white-studio-before.webp", occasion: "black-friday",
  },
  {
    id: "occ-summer", category: "occasions", needs: "photo", mode: "photo", model: QWEN_EDIT, size: "portrait",
    name: { en: "Summer", ar: "الصيف" },
    blurb: { en: "Sunlit sand and turquoise water.", ar: "رمل مشمس ومياه فيروزية." },
    prompt: "Place this product on sunlit sand at a Mediterranean beach with turquoise water behind, palm leaf shadows and a pair of sunglasses, bright summer advertising photo. Keep the product exactly the same. No text.",
    tip: KEEP, cover: "/templates/occ-summer.webp", before: "/templates/white-studio-before.webp", occasion: "summer",
  },
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


/** Next date a fixed-date occasion happens (month is 0-based). */
function yearly(month: number, day: number) {
  const now = new Date();
  const d = new Date(now.getFullYear(), month, day);
  if (d.getTime() < now.getTime() - 86_400_000) d.setFullYear(d.getFullYear() + 1);
  return { date: d };
}
/** Black Friday: the day after the fourth Thursday of November. */
function blackFriday() {
  const make = (y: number) => {
    const first = new Date(y, 10, 1);
    const thursday = 1 + ((4 - first.getDay() + 7) % 7) + 21;
    return new Date(y, 10, thursday + 1);
  };
  const now = new Date();
  let d = make(now.getFullYear());
  if (d.getTime() < now.getTime() - 86_400_000) d = make(now.getFullYear() + 1);
  return { date: d };
}
/** Approximate start dates (they depend on the moon sighting). */
const ISLAMIC: Record<"ramadan" | "eid", string[]> = {
  ramadan: ["2026-02-18", "2027-02-08", "2028-01-28", "2029-01-16", "2030-01-06"],
  eid: ["2026-03-20", "2027-03-10", "2028-02-27", "2029-02-15", "2030-02-05"],
};
function islamic(k: "ramadan" | "eid") {
  const now = Date.now() - 86_400_000;
  const d = ISLAMIC[k].map((s) => new Date(`${s}T00:00:00`)).find((x) => x.getTime() >= now) ?? new Date(ISLAMIC[k].at(-1)!);
  return { date: d, approx: true };
}

const OCCASION_DATES: Record<string, () => { date: Date; approx?: boolean }> = {
  "ramadan": () => islamic('ramadan'),
  "eid": () => islamic('eid'),
  "christmas": () => yearly(11, 25),
  "new-year": () => yearly(11, 31),
  "valentine": () => yearly(1, 14),
  "mothers-day": () => yearly(2, 21),
  "independence": () => yearly(10, 22),
  "black-friday": () => blackFriday(),
  "summer": () => yearly(5, 21),
};

/** Days until an occasion, or null for regular templates. */
export function daysUntil(t: Template) {
  const next = t.occasion ? OCCASION_DATES[t.occasion] : undefined;
  if (!next) return null;
  const { date, approx } = next();
  return { days: Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000)), date, approx };
}

/** Occasions sorted by which one is coming up first. */
export function upcomingOccasions() {
  return TEMPLATES.filter((t) => t.occasion).sort((a, b) => daysUntil(a)!.days - daysUntil(b)!.days);
}

export function getTemplate(id?: string | null) {
  return id ? TEMPLATES.find((t) => t.id === id) : undefined;
}

export function templateHref(t: Template) {
  const p = new URLSearchParams({ template: t.id });
  return `/create?${p}`;
}
