import type { Lang } from "./catalog";

/** Landing pages people find on Google, one per thing they search for, in English and Arabic. */

export type Media =
  | { kind: "pair"; before: string; after: string; ratio: string }
  | { kind: "image"; src: string; ratio: string }
  | { kind: "video"; src: string; poster: string; ratio: string }
  | { kind: "captions" };

export type Copy = {
  title: string; // <title>, about 60 characters
  description: string; // meta description, about 150 characters
  kicker: string;
  h1: string;
  intro: string[];
  alt: string;
  steps: [string, string][];
  features: [string, string][];
  faq: [string, string][];
  cta: string;
  card: string; // short line for the hub and "related" cards
};

export type SeoPage = { slug: string; href: string; media: Media; related: string[]; en: Copy; ar: Copy };

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "ai-food-ad-maker",
    href: "/create?template=burger-ad",
    media: { kind: "pair", before: "/templates/burger-ad-before.webp", after: "/templates/burger-ad.webp", ratio: "aspect-[4/5]" },
    related: ["ai-menu-maker", "lebanese-caption-generator", "social-media-post-maker"],
    en: {
      title: "AI Food Ad Maker for Restaurants | PostKit",
      description: "Turn a phone photo of your dish into a restaurant ad in seconds. Neon, café and menu looks, ready for Instagram and TikTok. Start with free credits.",
      kicker: "For restaurants, cafés and snacks",
      h1: "Turn a phone photo of your food into a real ad",
      intro: [
        "Snap your burger, manoushe or latte on the counter. PostKit keeps your actual dish exactly as it is and rebuilds everything around it: a dramatic black studio with flying ingredients, a sunny marble café table, or a clean menu shot.",
        "No photographer, no designer, no editing app. Pick a look, upload the photo, and the ad is ready in about 30 seconds, sized for an Instagram post, a story or a TikTok.",
      ],
      alt: "A phone photo of a burger next to the same burger as a neon advertising shot made with PostKit",
      steps: [
        ["Pick a food look", "Burger & food ad, café drink, menu photo, or one of the seasonal looks for Ramadan, Christmas and more."],
        ["Upload your phone photo", "Any clear photo works. PostKit keeps the food the same, so customers get what they see."],
        ["Post it", "Download, add your price or Arabic text, or share straight to Instagram, WhatsApp and TikTok."],
      ],
      features: [
        ["Your real dish", "The food stays the food. Only the background, light and mood change."],
        ["Made for Lebanese pages", "Arabic and English text, Lebanese-style captions and occasion templates built in."],
        ["Every size", "4:5 feed posts, 9:16 stories and reels, square posts and wide banners."],
        ["Pay as you go", "3 credits per ad. No subscription. New accounts start with free credits."],
      ],
      faq: [
        ["Will the AI change my food?", "No. The food templates tell the AI to keep your dish the same and only rebuild the scene around it. Use a clear, well-lit photo for the best result."],
        ["How much does one food ad cost?", "3 credits, about 15 US cents on the smallest pack. New accounts get free credits to try it first."],
        ["Can I add my price and logo?", "Yes. Tap + Text on the result to add a headline, a price badge, Arabic text and your logo, then save."],
        ["Can I use the ads for my business?", "Yes. Everything you make is yours to post, print and use in paid ads."],
      ],
      cta: "Make my food ad",
      card: "Phone photo → restaurant ad in seconds",
    },
    ar: {
      title: "صانع إعلانات المطاعم بالذكاء الاصطناعي | PostKit",
      description: "حوّل صورة طبقك من الموبايل إلى إعلان احترافي لمطعمك خلال ثوانٍ. جاهز لإنستغرام وتيك توك، بالعربي والإنجليزي، مع رصيد مجاني للبداية.",
      kicker: "للمطاعم والمقاهي والسناكات",
      h1: "حوّل صورة أكلك من الموبايل إلى إعلان حقيقي",
      intro: [
        "صوّر البرغر أو المنقوشة أو اللاتيه على الكاونتر. يحافظ PostKit على طبقك كما هو تمامًا ويعيد بناء كل ما حوله: استوديو أسود مع مكونات طائرة، طاولة رخام في مقهى مشمس، أو صورة نظيفة للمنيو.",
        "بلا مصوّر وبلا مصمم وبلا تطبيقات تعديل. اختر الشكل، ارفع الصورة، ويصبح الإعلان جاهزًا خلال 30 ثانية تقريبًا، بقياس منشور إنستغرام أو ستوري أو تيك توك.",
      ],
      alt: "صورة برغر من الموبايل بجانب البرغر نفسه كإعلان نيون مصنوع بـ PostKit",
      steps: [
        ["اختر شكل الإعلان", "إعلان برغر وطعام، مشروب المقهى، صورة منيو، أو قوالب المناسبات مثل رمضان والميلاد."],
        ["ارفع صورة الموبايل", "أي صورة واضحة تكفي. يبقى الطبق كما هو، فيرى الزبون ما سيحصل عليه فعلًا."],
        ["انشره", "نزّله، أضف السعر أو نصًا عربيًا، أو شاركه مباشرة على إنستغرام وواتساب وتيك توك."],
      ],
      features: [
        ["طبقك الحقيقي", "الأكل يبقى كما هو. تتغير الخلفية والإضاءة والجو فقط."],
        ["مصمم للصفحات اللبنانية", "نص عربي وإنجليزي، كابشن باللهجة اللبنانية، وقوالب المناسبات جاهزة."],
        ["كل القياسات", "منشورات 4:5، ستوري وريلز 9:16، منشورات مربعة وبانرات عريضة."],
        ["ادفع حسب استعمالك", "3 أرصدة للإعلان. بلا اشتراك. الحسابات الجديدة تبدأ برصيد مجاني."],
      ],
      faq: [
        ["هل يغيّر الذكاء الاصطناعي شكل الأكل؟", "لا. قوالب الطعام تطلب من الذكاء الاصطناعي الحفاظ على الطبق كما هو وإعادة بناء المشهد حوله فقط. استعمل صورة واضحة وإضاءة جيدة لأفضل نتيجة."],
        ["كم يكلّف إعلان واحد؟", "3 أرصدة، أي حوالي 15 سنتًا مع أصغر باقة. الحسابات الجديدة تحصل على رصيد مجاني للتجربة أولًا."],
        ["هل أستطيع إضافة السعر والشعار؟", "نعم. اضغط + نص على النتيجة لإضافة عنوان وشارة سعر ونص عربي وشعارك، ثم احفظ."],
        ["هل أستطيع استعمال الإعلانات لمحلي؟", "نعم. كل ما تصنعه لك، للنشر والطباعة والإعلانات الممولة."],
      ],
      cta: "اصنع إعلان الأكل",
      card: "صورة موبايل ← إعلان مطعم خلال ثوانٍ",
    },
  },
  {
    slug: "ai-menu-maker",
    href: "/menu",
    media: { kind: "image", src: "/examples/menu-example.webp", ratio: "aspect-[4/5]" },
    related: ["ai-food-ad-maker", "social-media-post-maker", "lebanese-caption-generator"],
    en: {
      title: "Free Menu Maker in Arabic & English | PostKit",
      description: "Make a bilingual restaurant menu in minutes: dishes, prices and photos in Arabic and English. Export for Instagram, Stories or A4 print. Free.",
      kicker: "Free · Arabic & English",
      h1: "Make a bilingual menu for Instagram or print, free",
      intro: [
        "Type your dishes, prices and a short description, add the Arabic name, and PostKit lays out a clean menu in your brand look. Neon night for burger joints, café cream for coffee shops, street bold for snacks.",
        "Export it as an Instagram post, a story, or an A4 page ready to print. Your draft stays on your phone, so you can update a price in ten seconds next week.",
      ],
      alt: "A two-language restaurant menu with dish photos and prices made with the PostKit menu maker",
      steps: [
        ["Add your dishes", "Name, Arabic name, price and a one-line description. Add a photo if you have one."],
        ["Pick a look and size", "Three looks and three sizes: Instagram post, story, or A4 print."],
        ["Download or post", "Save a sharp PNG, or share it straight to your page and WhatsApp status."],
      ],
      features: [
        ["Arabic done right", "Proper right-to-left Arabic next to English, in fonts that read well on phones."],
        ["Upgrade any dish photo", "One tap turns a phone photo into a clean menu shot (3 credits)."],
        ["Saved on your device", "Come back anytime to change prices or add new items."],
        ["Free to use", "Making and exporting menus costs nothing."],
      ],
      faq: [
        ["Is the menu maker really free?", "Yes. Building and downloading menus is free. Only the optional photo upgrade uses credits."],
        ["Can I print it?", "Yes. Choose the A4 size and download the PNG for your printer or print shop."],
        ["Can I write only in Arabic?", "Yes. Fill in only the Arabic names, or switch the site to Arabic for an all-Arabic layout."],
        ["How do I update prices later?", "Open the menu maker on the same phone. Your last menu is still there, so just edit and export again."],
      ],
      cta: "Make my menu",
      card: "Bilingual menus for Instagram and print",
    },
    ar: {
      title: "تصميم منيو مطعم مجانًا بالعربي والإنجليزي | PostKit",
      description: "صمّم منيو مطعمك بدقائق: الأطباق والأسعار والصور بالعربي والإنجليزي. نزّله لإنستغرام أو الستوري أو للطباعة A4. مجانًا.",
      kicker: "مجانًا · عربي وإنجليزي",
      h1: "صمّم منيو بلغتين لإنستغرام أو للطباعة، مجانًا",
      intro: [
        "اكتب أطباقك وأسعارك ووصفًا قصيرًا، أضف الاسم بالعربي، ويرتّب PostKit منيو أنيقًا بشكل يناسب محلك: نيون ليلي لمحلات البرغر، كريمي للمقاهي، وجريء للسناكات.",
        "نزّله كمنشور إنستغرام أو ستوري أو صفحة A4 جاهزة للطباعة. تبقى المسودة على موبايلك، فتعدّل السعر الأسبوع القادم بعشر ثوانٍ.",
      ],
      alt: "منيو مطعم بلغتين مع صور الأطباق والأسعار مصنوع بصانع المنيو في PostKit",
      steps: [
        ["أضف أطباقك", "الاسم بالإنجليزي والعربي، السعر، وسطر وصف. أضف صورة إذا عندك."],
        ["اختر الشكل والقياس", "ثلاثة أشكال وثلاثة قياسات: منشور إنستغرام، ستوري، أو طباعة A4."],
        ["نزّله أو انشره", "احفظ صورة PNG واضحة، أو شاركه مباشرة على صفحتك وحالة واتساب."],
      ],
      features: [
        ["عربي صحيح", "عربي من اليمين لليسار بجانب الإنجليزي، بخطوط واضحة على الموبايل."],
        ["حسّن صورة أي طبق", "ضغطة واحدة تحوّل صورة الموبايل إلى صورة منيو نظيفة (3 أرصدة)."],
        ["محفوظ على جهازك", "ارجع متى شئت لتغيير الأسعار أو إضافة أصناف جديدة."],
        ["مجاني", "تصميم المنيو وتنزيله بلا أي كلفة."],
      ],
      faq: [
        ["هل صانع المنيو مجاني فعلًا؟", "نعم. تصميم المنيو وتنزيله مجاني. فقط تحسين الصور الاختياري يستعمل الرصيد."],
        ["هل أستطيع طباعته؟", "نعم. اختر قياس A4 ونزّل صورة PNG للطابعة أو للمطبعة."],
        ["هل أستطيع الكتابة بالعربي فقط؟", "نعم. املأ الأسماء العربية فقط، أو حوّل الموقع إلى العربية لمنيو عربي بالكامل."],
        ["كيف أعدّل الأسعار لاحقًا؟", "افتح صانع المنيو على الموبايل نفسه. آخر منيو ما زال محفوظًا، عدّله ونزّله من جديد."],
      ],
      cta: "صمّم المنيو",
      card: "منيو بلغتين لإنستغرام والطباعة",
    },
  },
  {
    slug: "ai-product-photography",
    href: "/templates?cat=products",
    media: { kind: "pair", before: "/templates/luxury-podium-before.webp", after: "/templates/luxury-podium.webp", ratio: "aspect-[4/5]" },
    related: ["remove-background", "social-media-post-maker", "photo-to-video-ai"],
    en: {
      title: "AI Product Photography from Your Phone | PostKit",
      description: "Get studio product photos from a phone snap: white catalog background, luxury podium, neon tech ad or in-hand lifestyle. Your product stays the same.",
      kicker: "For online shops and brands",
      h1: "Studio product photos from a phone snap",
      intro: [
        "Shoot your perfume, sneaker or skincare bottle anywhere, even on the kitchen table. PostKit keeps the product itself unchanged and rebuilds the scene as a clean white catalog shot, a stone podium with soft shadows, a glossy neon ad or a lifestyle photo in someone's hand.",
        "It's the fastest way to get a full catalog and a week of posts without booking a studio.",
      ],
      alt: "A perfume bottle photographed at home next to the same bottle on a luxury stone podium made with PostKit",
      steps: [
        ["Pick a product look", "Clean white background, luxury podium, neon tech ad, product in hand or styled flat lay."],
        ["Upload one photo", "Shoot in daylight, product in focus. That's all it needs."],
        ["Use it everywhere", "Website, Instagram shop, WhatsApp catalog, marketplace listings and ads."],
      ],
      features: [
        ["Product stays identical", "Logos, labels and shapes are kept. Only the scene changes."],
        ["Catalog-ready white", "Pure white backgrounds with natural shadows for online stores."],
        ["Sharper with Upscale", "Enlarge any result up to 4x for print and big screens."],
        ["3 credits per photo", "No subscription, no studio fees."],
      ],
      faq: [
        ["Will my product label stay readable?", "In most cases yes. Use a sharp photo where the label is clear. If a detail changes, run it again or pick another look."],
        ["Can I get a plain white background?", "Yes. The Clean white background look is made for catalogs and marketplaces."],
        ["What size are the photos?", "Up to about 1024–1376 pixels, and you can upscale to 4x for print."],
        ["Do I own the photos?", "Yes. Use them on your site, socials, packaging and ads."],
      ],
      cta: "Make my product photo",
      card: "Studio product shots from your phone",
    },
    ar: {
      title: "تصوير منتجات احترافي بالذكاء الاصطناعي من الموبايل | PostKit",
      description: "صور منتجات بجودة استوديو من صورة موبايل: خلفية بيضاء للكتالوج، منصة فاخرة، إعلان نيون أو صورة في اليد. منتجك يبقى كما هو.",
      kicker: "للمتاجر الإلكترونية والبراندات",
      h1: "صور منتجات بجودة استوديو من صورة موبايل",
      intro: [
        "صوّر العطر أو الحذاء أو منتج العناية في أي مكان، حتى على طاولة المطبخ. يحافظ PostKit على المنتج نفسه بلا تغيير ويعيد بناء المشهد: خلفية بيضاء نظيفة للكتالوج، منصة حجرية بظلال ناعمة، إعلان نيون لامع، أو صورة لايف ستايل في اليد.",
        "أسرع طريقة لتحضير كتالوج كامل ومنشورات أسبوع كامل بلا حجز استوديو.",
      ],
      alt: "زجاجة عطر مصوّرة في البيت بجانب الزجاجة نفسها على منصة حجرية فاخرة مصنوعة بـ PostKit",
      steps: [
        ["اختر شكل الصورة", "خلفية بيضاء، منصة فاخرة، إعلان نيون، المنتج في اليد، أو ترتيب من الأعلى."],
        ["ارفع صورة واحدة", "صوّر بضوء النهار والمنتج واضح. هذا كل ما تحتاجه."],
        ["استعملها في كل مكان", "الموقع، متجر إنستغرام، كتالوج واتساب، المنصات والإعلانات."],
      ],
      features: [
        ["المنتج نفسه تمامًا", "الشعار والملصق والشكل كما هي. يتغير المشهد فقط."],
        ["أبيض جاهز للكتالوج", "خلفية بيضاء نقية مع ظلال طبيعية للمتاجر الإلكترونية."],
        ["أوضح مع التكبير", "كبّر أي نتيجة حتى 4 أضعاف للطباعة والشاشات الكبيرة."],
        ["3 أرصدة للصورة", "بلا اشتراك وبلا كلفة استوديو."],
      ],
      faq: [
        ["هل يبقى ملصق المنتج مقروءًا؟", "في أغلب الحالات نعم. استعمل صورة واضحة يظهر فيها الملصق جيدًا. إذا تغيّرت تفصيلة، أعد المحاولة أو اختر شكلًا آخر."],
        ["هل أحصل على خلفية بيضاء فقط؟", "نعم. شكل الخلفية البيضاء مصمم للكتالوجات والمتاجر."],
        ["ما حجم الصور؟", "حتى 1024 إلى 1376 بكسل تقريبًا، ويمكنك تكبيرها 4 أضعاف للطباعة."],
        ["هل الصور ملكي؟", "نعم. استعملها على موقعك وصفحاتك والتغليف والإعلانات."],
      ],
      cta: "اصنع صورة منتجي",
      card: "صور منتجات استوديو من موبايلك",
    },
  },
  {
    slug: "lebanese-caption-generator",
    href: "/captions",
    media: { kind: "captions" },
    related: ["ai-food-ad-maker", "social-media-post-maker", "talking-photo-ai"],
    en: {
      title: "Lebanese Caption Generator for Instagram | PostKit",
      description: "Write Instagram, TikTok and Facebook captions that sound Lebanese: Arabizi, Arabic or the Beirut mix, with hashtags and a call to action. Free.",
      kicker: "Free · Arabizi, Arabic, English, French",
      h1: "Captions that actually sound Lebanese",
      intro: [
        "Most AI captions sound like a translated brochure. PostKit writes the way pages in Beirut actually post: \"Hi kifkon! Ça va?\", Yalla, Sahtein, Ma tfawwetouwa, in Arabizi, Arabic script, English or the Lebanese mix.",
        "Say what the post is about, pick the tone and the call to action, and you get three different captions with local hashtags, ready to copy.",
      ],
      alt: "Three Lebanese-style Instagram captions with hashtags written by PostKit",
      steps: [
        ["Say what the post is about", "\"Our new double smash burger with melted cheddar\" is enough."],
        ["Pick language, tone and call to action", "Lebanese mix, Arabizi, Arabic, English or French. Fun, warm, luxury or hype. WhatsApp us, DM, visit or order now."],
        ["Copy and post", "Three captions with 6–10 hashtags each. Copy the full caption, the text only, or just the hashtags."],
      ],
      features: [
        ["Real Lebanese expressions", "Yalla, Kifkon, Tfaddalo, 3an jad: written naturally, never forced."],
        ["Local hashtags", "Popular tags mixed with #Beirut, #Lebanon and #LebanonFood where they fit."],
        ["Three angles every time", "A story, a short punchy line and an offer-led caption."],
        ["Free", "Captions don't use credits."],
      ],
      faq: [
        ["Is the caption writer free?", "Yes. It doesn't use any credits."],
        ["Can it write in Arabizi?", "Yes. Lebanese Arabizi uses Latin letters with 3, 7 and 2 for Arabic sounds, the way people text."],
        ["Will it invent prices or claims?", "No. It only mentions prices, offers and details you type in."],
        ["Which platforms is it for?", "Instagram, Facebook and TikTok. The captions are short enough for all three."],
      ],
      cta: "Write my captions",
      card: "Captions in Arabizi, Arabic or the Beirut mix",
    },
    ar: {
      title: "كتابة كابشن إنستغرام باللهجة اللبنانية | PostKit",
      description: "اكتب كابشن لإنستغرام وتيك توك وفيسبوك بلهجة لبنانية حقيقية: عربيزي، عربي أو المزيج البيروتي، مع هاشتاغات ودعوة للتواصل. مجانًا.",
      kicker: "مجانًا · عربيزي، عربي، إنجليزي، فرنسي",
      h1: "كابشن بلهجة لبنانية حقيقية",
      intro: [
        "أغلب كابشن الذكاء الاصطناعي تبدو كأنها كتيّب مترجم. PostKit يكتب مثلما تنشر الصفحات في بيروت فعلًا: \"Hi kifkon! Ça va?\"، يلّا، صحتين، ما تفوّتوها، بالعربيزي أو بالحرف العربي أو بالإنجليزي أو بالمزيج اللبناني.",
        "قل عن ماذا المنشور، اختر الأسلوب والدعوة للتواصل، فتحصل على ثلاث كابشن مختلفة مع هاشتاغات محلية جاهزة للنسخ.",
      ],
      alt: "ثلاث كابشن إنستغرام بأسلوب لبناني مع هاشتاغات كتبها PostKit",
      steps: [
        ["قل عن ماذا المنشور", "مثلًا \"برغر دبل سماش جديد مع شيدر ذايب\" يكفي."],
        ["اختر اللغة والأسلوب والدعوة", "مزيج لبناني، عربيزي، عربي، إنجليزي أو فرنسي. مرح، دافئ، فخم أو حماسي. واتساب، رسالة، زيارة أو اطلب الآن."],
        ["انسخ وانشر", "ثلاث كابشن مع 6 إلى 10 هاشتاغات لكل واحدة. انسخ الكل أو النص فقط أو الهاشتاغات."],
      ],
      features: [
        ["تعابير لبنانية حقيقية", "يلّا، كيفكن، تفضّلوا، عن جد: مكتوبة بشكل طبيعي وبلا تكلّف."],
        ["هاشتاغات محلية", "هاشتاغات رائجة مع #Beirut و#Lebanon و#LebanonFood حين تناسب."],
        ["ثلاث زوايا كل مرة", "قصة، جملة قصيرة قوية، وكابشن يركّز على العرض."],
        ["مجاني", "الكابشن لا تستعمل الرصيد."],
      ],
      faq: [
        ["هل كتابة الكابشن مجانية؟", "نعم. لا تستعمل أي رصيد."],
        ["هل يكتب بالعربيزي؟", "نعم. العربيزي اللبناني بالأحرف اللاتينية مع 3 و7 و2 للأصوات العربية، مثلما يكتب الناس بالرسائل."],
        ["هل يخترع أسعارًا أو وعودًا؟", "لا. يذكر فقط الأسعار والعروض والتفاصيل التي تكتبها أنت."],
        ["لأي منصات؟", "إنستغرام وفيسبوك وتيك توك. الكابشن قصيرة بما يكفي للثلاثة."],
      ],
      cta: "اكتب الكابشن",
      card: "كابشن بالعربيزي أو العربي أو المزيج البيروتي",
    },
  },
  {
    slug: "talking-photo-ai",
    href: "/talk",
    media: { kind: "video", src: "/social/talk-demo.mp4", poster: "/social/talk-demo.webp", ratio: "aspect-[9/16]" },
    related: ["photo-to-video-ai", "lebanese-caption-generator", "social-media-post-maker"],
    en: {
      title: "Talking Photo AI in Arabic & English | PostKit",
      description: "Make any photo talk: upload a face, type a line in Arabic or English, and get a lip-synced video for ads, welcomes and offers. Or use your own voice.",
      kicker: "Arabic & English voices",
      h1: "Make a photo talk, in Arabic or English",
      intro: [
        "Upload a photo of a person, a mascot or a product with a face, type what it should say, and PostKit records a natural voice and moves the lips to match. Great for a chef announcing today's special, a shop owner welcoming customers, or a mascot pushing an offer.",
        "Prefer your own voice? Upload a voice note instead and the photo says it in your voice.",
      ],
      alt: "A chef's photo speaking Arabic with moving lips, made with PostKit's talking photo",
      steps: [
        ["Upload a photo with a clear face", "Facing the camera works best. People, cartoon mascots and illustrated characters all work."],
        ["Type the line or upload your voice", "Up to about 15 seconds of speech in Arabic or English. Pick a voice and a mood."],
        ["Get the video", "It's ready in a few minutes and saved to your Library, sized for reels and stories."],
      ],
      features: [
        ["Arabic that sounds right", "Natural Arabic and English voices with happy, calm or excited moods."],
        ["Your own voice", "Upload an mp3 or wav recording and skip the AI voice."],
        ["Lip-sync that matches", "Mouth, head and expression move with the words."],
        ["20 credits per video", "Charged only when it's made. Refunded automatically if it fails."],
      ],
      faq: [
        ["What photo works best?", "One clear face looking at the camera, with good light and nothing covering the mouth."],
        ["How long can the video be?", "About 15 seconds of speech per video, perfect for a reel or a story."],
        ["Can I use my own recording?", "Yes. Tap \"use a recording of your own voice\" and upload an mp3 or wav."],
        ["Is it OK to use someone else's face?", "Only use photos of yourself, people who agreed, or characters you own."],
      ],
      cta: "Make my photo talk",
      card: "A photo that speaks Arabic or English",
    },
    ar: {
      title: "صورة تتكلم بالذكاء الاصطناعي بالعربي | PostKit",
      description: "اجعل أي صورة تتكلم: ارفع صورة وجه، اكتب جملة بالعربي أو الإنجليزي، واحصل على فيديو بشفاه متحركة للإعلانات والترحيب والعروض.",
      kicker: "أصوات عربية وإنجليزية",
      h1: "اجعل الصورة تتكلم، بالعربي أو بالإنجليزي",
      intro: [
        "ارفع صورة شخص أو شخصية كرتونية أو منتج له وجه، اكتب ما يجب أن يقوله، فيسجّل PostKit صوتًا طبيعيًا ويحرّك الشفاه معه. مثالي لشيف يعلن طبق اليوم، أو صاحب محل يرحّب بالزبائن، أو شخصية تروّج لعرض.",
        "تفضّل صوتك؟ ارفع رسالة صوتية بدل ذلك فتتكلم الصورة بصوتك أنت.",
      ],
      alt: "صورة شيف تتكلم بالعربي بشفاه متحركة مصنوعة بـ PostKit",
      steps: [
        ["ارفع صورة بوجه واضح", "الأفضل أن ينظر الوجه إلى الكاميرا. الأشخاص والشخصيات الكرتونية والرسومات كلها تنفع."],
        ["اكتب الجملة أو ارفع صوتك", "حتى 15 ثانية كلام تقريبًا بالعربي أو الإنجليزي. اختر الصوت والمزاج."],
        ["احصل على الفيديو", "يصبح جاهزًا خلال دقائق ويُحفظ في مكتبتك بقياس الريلز والستوري."],
      ],
      features: [
        ["عربي بصوت طبيعي", "أصوات عربية وإنجليزية طبيعية بمزاج سعيد أو هادئ أو متحمس."],
        ["صوتك أنت", "ارفع تسجيل mp3 أو wav واستغنِ عن الصوت الاصطناعي."],
        ["شفاه متطابقة", "الفم والرأس والتعابير تتحرك مع الكلام."],
        ["20 رصيدًا للفيديو", "تُخصم فقط عند صنعه، وتُرد تلقائيًا إذا فشل."],
      ],
      faq: [
        ["أي صورة تعطي أفضل نتيجة؟", "وجه واحد واضح ينظر إلى الكاميرا، بإضاءة جيدة ولا شيء يغطي الفم."],
        ["كم مدة الفيديو؟", "حوالي 15 ثانية كلام لكل فيديو، مثالي للريل أو الستوري."],
        ["هل أستطيع استعمال تسجيلي؟", "نعم. اضغط \"استعمل تسجيلًا بصوتك\" وارفع ملف mp3 أو wav."],
        ["هل يجوز استعمال وجه شخص آخر؟", "استعمل فقط صورك، أو صور أشخاص وافقوا، أو شخصيات تملكها."],
      ],
      cta: "اجعل صورتي تتكلم",
      card: "صورة تتكلم بالعربي أو الإنجليزي",
    },
  },
  {
    slug: "before-after-reel-maker",
    href: "/social",
    media: { kind: "pair", before: "/templates/cafe-drink-before.webp", after: "/templates/cafe-drink.webp", ratio: "aspect-[4/5]" },
    related: ["ai-food-ad-maker", "photo-to-video-ai", "social-media-post-maker"],
    en: {
      title: "Before & After Reel Maker for TikTok | PostKit",
      description: "Make a 9:16 before-and-after reel in one tap: your original photo, a swipe reveal, then the result. Free, made in your browser, ready for Reels and TikTok.",
      kicker: "Free · Reels, TikTok, Stories",
      h1: "One-tap before & after reels",
      intro: [
        "Before-and-after is the format that stops thumbs. After every edit, PostKit can turn your original photo and the result into a 5-second vertical video: the plain shot, a glowing swipe across the screen, then the finished ad with a small \"Made with PostKit\" tag.",
        "It's made right in your browser, so it's instant and free, ready to post as a Reel, a TikTok or a story.",
      ],
      alt: "A plain café drink photo and the same drink on a sunny marble table, the two halves of a PostKit before-and-after reel",
      steps: [
        ["Edit a photo", "Use any template or your own prompt to restyle a photo."],
        ["Tap Before/After reel", "PostKit records a 9:16 swipe-reveal video in a few seconds."],
        ["Post it", "Share straight to Instagram, TikTok or WhatsApp, or save it to your Library."],
      ],
      features: [
        ["Vertical 9:16", "Fits Reels, TikTok and Stories with no cropping."],
        ["Made on your phone", "No upload, no waiting, no extra app."],
        ["Bilingual labels", "BEFORE / AFTER, or قبل / بعد on the Arabic site."],
        ["Free", "Reels don't use credits."],
      ],
      faq: [
        ["Does the reel cost credits?", "No. Only the photo edit uses credits. The reel is free."],
        ["Which phones does it work on?", "Recent iPhones and Android phones in Safari or Chrome."],
        ["How long is the reel?", "About 5.5 seconds, the sweet spot for a looping reel."],
        ["Can I add music?", "Add a trending sound in Instagram or TikTok when you post."],
      ],
      cta: "Make a before & after",
      card: "Swipe-reveal reels in one tap",
    },
    ar: {
      title: "صانع فيديو قبل وبعد للريلز والتيك توك | PostKit",
      description: "اصنع فيديو قبل وبعد بقياس 9:16 بضغطة واحدة: صورتك الأصلية، ثم كشف بالسحب، ثم النتيجة. مجانًا وجاهز للريلز والتيك توك.",
      kicker: "مجانًا · ريلز، تيك توك، ستوري",
      h1: "فيديو قبل وبعد بضغطة واحدة",
      intro: [
        "قبل وبعد هو الشكل الذي يوقف التمرير. بعد كل تعديل، يحوّل PostKit صورتك الأصلية والنتيجة إلى فيديو عمودي من 5 ثوانٍ: الصورة العادية، خط مضيء يمسح الشاشة، ثم الإعلان النهائي مع إشارة صغيرة \"Made with PostKit\".",
        "يُصنع مباشرة في متصفحك، فيكون فوريًا ومجانيًا، وجاهزًا للنشر كريل أو تيك توك أو ستوري.",
      ],
      alt: "صورة مشروب عادية والمشروب نفسه على طاولة رخام مشمسة، نصفا فيديو قبل وبعد من PostKit",
      steps: [
        ["عدّل صورة", "استعمل أي قالب أو وصفك الخاص لتغيير شكل الصورة."],
        ["اضغط فيديو قبل وبعد", "يسجّل PostKit فيديو 9:16 بكشف بالسحب خلال ثوانٍ."],
        ["انشره", "شاركه مباشرة على إنستغرام أو تيك توك أو واتساب، أو احفظه في مكتبتك."],
      ],
      features: [
        ["عمودي 9:16", "يناسب الريلز والتيك توك والستوري بلا قص."],
        ["يُصنع على موبايلك", "بلا رفع، بلا انتظار، بلا تطبيق إضافي."],
        ["كلمات بلغتين", "BEFORE / AFTER، أو قبل / بعد في الموقع العربي."],
        ["مجاني", "الفيديو لا يستعمل الرصيد."],
      ],
      faq: [
        ["هل يكلّف الفيديو رصيدًا؟", "لا. فقط تعديل الصورة يستعمل الرصيد. الفيديو مجاني."],
        ["على أي موبايلات يعمل؟", "آيفون وأندرويد الحديثة على سفاري أو كروم."],
        ["كم مدته؟", "حوالي 5.5 ثوانٍ، المدة المثالية لريل يعيد نفسه."],
        ["هل أستطيع إضافة موسيقى؟", "أضف صوتًا رائجًا في إنستغرام أو تيك توك عند النشر."],
      ],
      cta: "اصنع قبل وبعد",
      card: "فيديو قبل وبعد بضغطة",
    },
  },
  {
    slug: "photo-to-video-ai",
    href: "/create?template=photo-video",
    media: { kind: "video", src: "/templates/photo-video.mp4", poster: "/templates/photo-video.webp", ratio: "aspect-[9/16]" },
    related: ["talking-photo-ai", "before-after-reel-maker", "ai-product-photography"],
    en: {
      title: "Turn a Photo into a Video with AI | PostKit",
      description: "Animate any photo into a 5-second video for reels and stories: slow camera moves, steam, light and motion. From 10 credits, no editing skills needed.",
      kicker: "Reels and stories from still photos",
      h1: "Turn any photo into a 5-second video",
      intro: [
        "Upload a product, a dish or a place and PostKit brings it to life: a slow cinematic push-in, steam rising from a coffee, light sliding across a bottle, waves moving behind a pool. It's the easiest way to post video when all you have is photos.",
        "Choose a fast model for everyday posts or a cinematic one for big moments, and describe the motion in Arabic or English.",
      ],
      alt: "A still photo turned into a moving vertical video with PostKit",
      steps: [
        ["Upload a photo", "Any photo you have, or one you just made with PostKit."],
        ["Describe the motion", "\"Slow push-in, steam rising\" or pick a ready-made idea. Arabic works too."],
        ["Post the clip", "A 5-second vertical or wide video, saved to your Library."],
      ],
      features: [
        ["Several video engines", "Fast and cheap for daily posts, cinematic for launches."],
        ["Keeps your product", "The photo stays recognizable while the scene moves."],
        ["Vertical or wide", "9:16 for Reels and TikTok, 16:9 for YouTube and websites."],
        ["From 10 credits", "Charged only when the video is made."],
      ],
      faq: [
        ["How long does a video take?", "Usually 30 seconds to 2 minutes depending on the engine."],
        ["How long are the videos?", "5 seconds, a good length for looping reels."],
        ["Can I describe the motion in Arabic?", "Yes. PostKit translates it before sending it to the video engine."],
        ["Does it have sound?", "The clips are silent. Add music or a trending sound when you post."],
      ],
      cta: "Animate my photo",
      card: "Still photo → 5-second video",
    },
    ar: {
      title: "تحويل الصور إلى فيديو بالذكاء الاصطناعي | PostKit",
      description: "حرّك أي صورة إلى فيديو من 5 ثوانٍ للريلز والستوري: حركة كاميرا بطيئة، بخار، ضوء وحركة. من 10 أرصدة، بلا أي خبرة مونتاج.",
      kicker: "ريلز وستوري من صور ثابتة",
      h1: "حوّل أي صورة إلى فيديو من 5 ثوانٍ",
      intro: [
        "ارفع صورة منتج أو طبق أو مكان فيحييه PostKit: اقتراب سينمائي بطيء، بخار يتصاعد من القهوة، ضوء ينزلق على زجاجة، أمواج تتحرك خلف المسبح. أسهل طريقة لنشر فيديو عندما لا تملك إلا صورًا.",
        "اختر محركًا سريعًا للمنشورات اليومية أو سينمائيًا للمناسبات الكبيرة، وصف الحركة بالعربي أو الإنجليزي.",
      ],
      alt: "صورة ثابتة تحولت إلى فيديو عمودي متحرك بـ PostKit",
      steps: [
        ["ارفع صورة", "أي صورة عندك، أو صورة صنعتها للتو بـ PostKit."],
        ["صف الحركة", "\"اقتراب بطيء وبخار يتصاعد\" أو اختر فكرة جاهزة. العربي يعمل أيضًا."],
        ["انشر الفيديو", "فيديو عمودي أو عريض من 5 ثوانٍ، محفوظ في مكتبتك."],
      ],
      features: [
        ["عدة محركات فيديو", "سريع ورخيص للمنشورات اليومية، وسينمائي للإطلاقات."],
        ["يحافظ على منتجك", "تبقى الصورة واضحة بينما يتحرك المشهد."],
        ["عمودي أو عريض", "9:16 للريلز والتيك توك، و16:9 ليوتيوب والمواقع."],
        ["من 10 أرصدة", "تُخصم فقط عند صنع الفيديو."],
      ],
      faq: [
        ["كم يستغرق الفيديو؟", "عادة من 30 ثانية إلى دقيقتين حسب المحرك."],
        ["كم مدة الفيديوهات؟", "5 ثوانٍ، مدة مناسبة لريلز تعيد نفسها."],
        ["هل أصف الحركة بالعربي؟", "نعم. يترجمها PostKit قبل إرسالها لمحرك الفيديو."],
        ["هل فيه صوت؟", "الفيديوهات صامتة. أضف موسيقى أو صوتًا رائجًا عند النشر."],
      ],
      cta: "حرّك صورتي",
      card: "صورة ثابتة ← فيديو 5 ثوانٍ",
    },
  },
  {
    slug: "social-media-post-maker",
    href: "/pack",
    media: { kind: "image", src: "/examples/story-example.webp", ratio: "aspect-[9/16]" },
    related: ["ai-food-ad-maker", "lebanese-caption-generator", "before-after-reel-maker"],
    en: {
      title: "Social Media Post Maker for Small Businesses | PostKit",
      description: "One product photo becomes a feed post, a story, a 5-second reel and a caption, all in the same look. A week of content in one tap, made in Lebanon.",
      kicker: "Post Pack · for page managers and shop owners",
      h1: "One photo, a week of posts",
      intro: [
        "Post Pack takes one phone photo of your product and makes everything a page needs at once: a 4:5 feed post, a 9:16 story with space for a headline, a 5-second reel, and a caption with hashtags, all in the same look so your grid stays consistent.",
        "Add seasonal looks for Ramadan, Christmas, Black Friday and Independence Day, with countdowns so you're ready before every occasion.",
      ],
      alt: "A vertical story post of a burger with neon lights, part of a PostKit Post Pack",
      steps: [
        ["Upload a product photo", "One clear phone photo is all it needs."],
        ["Pick the look", "Food, products, lifestyle or an occasion like Ramadan or Christmas."],
        ["Get the pack", "Feed post, story, reel and caption arrive together, each with a Post button."],
      ],
      features: [
        ["Four pieces, one look", "Post, story, reel and caption match each other."],
        ["Occasion ready", "Templates with countdowns for every big date in Lebanon."],
        ["Plan your grid", "Preview how new posts sit on your Instagram grid before you publish."],
        ["16 credits per pack", "Anything that fails is refunded automatically."],
      ],
      faq: [
        ["What's in a Post Pack?", "A 4:5 feed post, a 9:16 story, a 5-second reel and three captions with hashtags."],
        ["How much does it cost?", "16 credits for the whole pack. Parts that fail are refunded."],
        ["Is it good for social media managers?", "Yes. It's built for people running several business pages. Ask on WhatsApp about bigger credit packs."],
        ["Can I post directly?", "Every piece has a Post button that opens your phone's share sheet for Instagram, TikTok and WhatsApp."],
      ],
      cta: "Make my Post Pack",
      card: "Post, story, reel and caption from one photo",
    },
    ar: {
      title: "تصميم بوستات سوشال ميديا للمحلات والمطاعم | PostKit",
      description: "صورة منتج واحدة تصبح منشورًا وستوري وريل من 5 ثوانٍ وكابشن، كلها بالشكل نفسه. محتوى أسبوع كامل بضغطة، مصنوع في لبنان.",
      kicker: "باقة المنشورات · لمديري الصفحات وأصحاب المحلات",
      h1: "صورة واحدة، محتوى أسبوع كامل",
      intro: [
        "تأخذ باقة المنشورات صورة موبايل واحدة لمنتجك وتصنع كل ما تحتاجه الصفحة دفعة واحدة: منشور 4:5، ستوري 9:16 مع مساحة للعنوان، ريل من 5 ثوانٍ، وكابشن مع هاشتاغات، كلها بالشكل نفسه ليبقى حسابك متناسقًا.",
        "أضف قوالب المناسبات لرمضان والميلاد والبلاك فرايدي وعيد الاستقلال، مع عدّ تنازلي لتكون جاهزًا قبل كل مناسبة.",
      ],
      alt: "ستوري عمودي لبرغر بإضاءة نيون، جزء من باقة منشورات PostKit",
      steps: [
        ["ارفع صورة المنتج", "صورة موبايل واضحة واحدة تكفي."],
        ["اختر الشكل", "طعام، منتجات، لايف ستايل، أو مناسبة مثل رمضان أو الميلاد."],
        ["استلم الباقة", "المنشور والستوري والريل والكابشن تصل معًا، ولكل واحد زر نشر."],
      ],
      features: [
        ["أربع قطع بشكل واحد", "المنشور والستوري والريل والكابشن متناسقة."],
        ["جاهز للمناسبات", "قوالب مع عدّ تنازلي لكل المناسبات الكبيرة في لبنان."],
        ["خطط لحسابك", "شاهد كيف تبدو المنشورات الجديدة على شبكة إنستغرام قبل النشر."],
        ["16 رصيدًا للباقة", "أي جزء يفشل يُرد رصيده تلقائيًا."],
      ],
      faq: [
        ["ماذا تحتوي باقة المنشورات؟", "منشور 4:5، ستوري 9:16، ريل من 5 ثوانٍ، وثلاث كابشن مع هاشتاغات."],
        ["كم تكلّف؟", "16 رصيدًا للباقة كاملة. الأجزاء التي تفشل يُرد رصيدها."],
        ["هل تناسب مديري السوشال ميديا؟", "نعم. مصممة لمن يدير عدة صفحات تجارية. اسأل على واتساب عن باقات رصيد أكبر."],
        ["هل أنشر مباشرة؟", "لكل قطعة زر نشر يفتح قائمة المشاركة في موبايلك لإنستغرام وتيك توك وواتساب."],
      ],
      cta: "اصنع باقتي",
      card: "منشور وستوري وريل وكابشن من صورة واحدة",
    },
  },
  {
    slug: "remove-background",
    href: "/create?source=photo",
    media: { kind: "pair", before: "/models/edit-before.webp", after: "/models/cutout.webp", ratio: "aspect-[3/4]" },
    related: ["ai-product-photography", "social-media-post-maker", "ai-food-ad-maker"],
    en: {
      title: "Remove Background from Photos with AI | PostKit",
      description: "Remove the background from any product or portrait photo in one tap and get a clean cutout. Upscale it up to 4x for print. From 2 credits.",
      kicker: "Cutout and upscale",
      h1: "Remove the background in one tap",
      intro: [
        "Upload a photo and tap Remove background. PostKit separates your product, person or pet from everything behind it, with clean edges around hair, straps and shoe laces, and gives you a transparent PNG.",
        "Then drop it on a new color, put it in a template, or upscale it up to 4x so it stays sharp on a banner or a printed flyer.",
      ],
      alt: "A sneaker photographed on a street next to the same sneaker cut out on a lime background with PostKit",
      steps: [
        ["Upload a photo", "Products, people, pets, food: anything with a clear subject."],
        ["Tap Remove background", "The cutout is ready in a few seconds as a transparent PNG."],
        ["Use it anywhere", "Place it on a new background, in a template, or upscale it for print."],
      ],
      features: [
        ["Clean edges", "Hair, straps and fine details are kept."],
        ["Transparent PNG", "Ready for Canva, Photoshop, websites and catalogs."],
        ["Upscale to 4x", "Enlarge small photos for banners and print (3 credits)."],
        ["2 credits per cutout", "No subscription."],
      ],
      faq: [
        ["What format do I get?", "A PNG with a transparent background."],
        ["How much does it cost?", "2 credits per cutout. Upscaling is 3 credits."],
        ["Does it work on people and pets?", "Yes, as well as products and food."],
        ["Can I put a white background instead?", "Yes. Use the Clean white background template for a catalog-ready white with natural shadows."],
      ],
      cta: "Remove a background",
      card: "Clean cutouts and 4x upscale",
    },
    ar: {
      title: "إزالة خلفية الصور بالذكاء الاصطناعي | PostKit",
      description: "أزل خلفية أي صورة منتج أو شخص بضغطة واحدة واحصل على قصّ نظيف بخلفية شفافة. وكبّرها حتى 4 أضعاف للطباعة. من 2 رصيد.",
      kicker: "قص الخلفية والتكبير",
      h1: "أزل الخلفية بضغطة واحدة",
      intro: [
        "ارفع صورة واضغط إزالة الخلفية. يفصل PostKit منتجك أو الشخص أو الحيوان الأليف عن كل ما خلفه، بحواف نظيفة حول الشعر والأحزمة وأربطة الأحذية، ويعطيك صورة PNG شفافة.",
        "ضعها بعد ذلك على لون جديد، أو داخل قالب، أو كبّرها حتى 4 أضعاف لتبقى واضحة على بانر أو منشور مطبوع.",
      ],
      alt: "حذاء رياضي مصوّر في الشارع بجانب الحذاء نفسه مقصوصًا على خلفية خضراء بـ PostKit",
      steps: [
        ["ارفع صورة", "منتجات، أشخاص، حيوانات، طعام: أي شيء واضح."],
        ["اضغط إزالة الخلفية", "يصبح القص جاهزًا خلال ثوانٍ كصورة PNG شفافة."],
        ["استعملها في أي مكان", "ضعها على خلفية جديدة أو داخل قالب، أو كبّرها للطباعة."],
      ],
      features: [
        ["حواف نظيفة", "الشعر والأحزمة والتفاصيل الدقيقة محفوظة."],
        ["PNG شفاف", "جاهز لكانفا وفوتوشوب والمواقع والكتالوجات."],
        ["تكبير حتى 4 أضعاف", "كبّر الصور الصغيرة للبانرات والطباعة (3 أرصدة)."],
        ["2 رصيد للقص", "بلا اشتراك."],
      ],
      faq: [
        ["ما الصيغة التي أحصل عليها؟", "صورة PNG بخلفية شفافة."],
        ["كم يكلّف؟", "2 رصيد لكل قص. التكبير 3 أرصدة."],
        ["هل يعمل على الأشخاص والحيوانات؟", "نعم، وعلى المنتجات والطعام أيضًا."],
        ["هل أضع خلفية بيضاء بدلها؟", "نعم. استعمل قالب الخلفية البيضاء للحصول على أبيض جاهز للكتالوج مع ظلال طبيعية."],
      ],
      cta: "أزل الخلفية",
      card: "قص نظيف وتكبير 4 أضعاف",
    },
  },
  {
    slug: "real-estate-photo-ai",
    href: "/templates?cat=realestate",
    media: { kind: "pair", before: "/templates/staging-before.webp", after: "/templates/staging.webp", ratio: "aspect-[4/3]" },
    related: ["ai-product-photography", "photo-to-video-ai", "social-media-post-maker"],
    en: {
      title: "AI Real Estate Photos & Virtual Staging | PostKit",
      description: "Brighten dark listing photos and furnish empty rooms with AI virtual staging in seconds. Better listing photos for agents and landlords in Lebanon.",
      kicker: "For agents, landlords and Airbnb hosts",
      h1: "Bright listing photos and virtual staging in seconds",
      intro: [
        "Dark rooms and empty apartments don't rent. Upload a phone photo of the room and PostKit can brighten it to a sunny, straight, inviting listing photo, or furnish an empty space with a modern living room so buyers can picture living there.",
        "The walls, windows and layout stay the same; only the light and the furniture change.",
      ],
      alt: "An empty room next to the same room furnished with virtual staging by PostKit",
      steps: [
        ["Upload a room photo", "Shoot wide from a corner, with the lights on."],
        ["Pick Bright listing or Virtual staging", "Brighten and straighten, or add furniture to an empty room."],
        ["Post the listing", "Wide photos ready for listing sites, Instagram and WhatsApp groups."],
      ],
      features: [
        ["Same room, better light", "Walls, windows and layout are kept."],
        ["Furnish empty rooms", "Modern, neutral staging that suits most buyers."],
        ["Turn it into a tour", "Animate any photo into a slow 5-second walk-in video."],
        ["3 credits per photo", "Far cheaper than a staging company."],
      ],
      faq: [
        ["Is virtual staging allowed in listings?", "It's common practice. Mention \"virtually staged\" in the listing so buyers know."],
        ["Will it change the room's size or windows?", "No. The templates keep walls, windows and layout. Only light and furniture change."],
        ["What photo works best?", "A wide shot from a corner, at eye level, with the lights on."],
        ["Can I make a video tour?", "Yes. Animate any result into a 5-second video from 10 credits."],
      ],
      cta: "Improve my listing photo",
      card: "Bright listings and virtual staging",
    },
    ar: {
      title: "صور عقارات بالذكاء الاصطناعي وتأثيث افتراضي | PostKit",
      description: "أضئ صور العقارات المعتمة وأثّث الغرف الفارغة افتراضيًا خلال ثوانٍ. صور أفضل لإعلانات البيع والإيجار للوكلاء والمالكين في لبنان.",
      kicker: "للوكلاء العقاريين والمالكين ومضيفي Airbnb",
      h1: "صور عقارات مضيئة وتأثيث افتراضي خلال ثوانٍ",
      intro: [
        "الغرف المعتمة والشقق الفارغة لا تؤجَّر بسهولة. ارفع صورة موبايل للغرفة فيحوّلها PostKit إلى صورة إعلان مشمسة ومستقيمة وجذابة، أو يؤثث المساحة الفارغة بصالون عصري ليتخيّل المشتري نفسه فيها.",
        "الجدران والنوافذ والتوزيع تبقى كما هي، يتغير الضوء والأثاث فقط.",
      ],
      alt: "غرفة فارغة بجانب الغرفة نفسها مؤثثة افتراضيًا بـ PostKit",
      steps: [
        ["ارفع صورة الغرفة", "صوّر بزاوية واسعة من الزاوية والأضواء مشتعلة."],
        ["اختر إضاءة الإعلان أو التأثيث الافتراضي", "أضئ وقوّم الصورة، أو أضف أثاثًا لغرفة فارغة."],
        ["انشر الإعلان", "صور عريضة جاهزة لمواقع العقارات وإنستغرام ومجموعات واتساب."],
      ],
      features: [
        ["الغرفة نفسها بضوء أفضل", "الجدران والنوافذ والتوزيع محفوظة."],
        ["أثّث الغرف الفارغة", "تأثيث عصري ومحايد يناسب أغلب المشترين."],
        ["حوّلها إلى جولة", "حرّك أي صورة إلى فيديو دخول بطيء من 5 ثوانٍ."],
        ["3 أرصدة للصورة", "أرخص بكثير من شركات التأثيث."],
      ],
      faq: [
        ["هل يُسمح بالتأثيث الافتراضي في الإعلانات؟", "هو ممارسة شائعة. اذكر \"تأثيث افتراضي\" في الإعلان ليعرف المشتري."],
        ["هل يغيّر حجم الغرفة أو النوافذ؟", "لا. القوالب تحافظ على الجدران والنوافذ والتوزيع. يتغير الضوء والأثاث فقط."],
        ["أي صورة تعطي أفضل نتيجة؟", "لقطة واسعة من زاوية الغرفة، بمستوى النظر، والأضواء مشتعلة."],
        ["هل أصنع فيديو جولة؟", "نعم. حرّك أي نتيجة إلى فيديو من 5 ثوانٍ من 10 أرصدة."],
      ],
      cta: "حسّن صورة العقار",
      card: "صور عقارات مضيئة وتأثيث افتراضي",
    },
  },
];

export function seoPage(slug: string) {
  return SEO_PAGES.find((p) => p.slug === slug);
}

export function seoPath(slug: string | null, lang: Lang) {
  const base = lang === "ar" ? "/ar/use" : "/use";
  return slug ? `${base}/${slug}` : base;
}

/** Sample captions shown on the caption page: real output from the caption writer (Oct 2026). */
export const SAMPLE_CAPTIONS = [
  {
    text: "Hi kifkon! Ça va? 🇱🇧\nThis double smash burger with melted cheddar? 3an jad, it's insane 🤤\nYalla, WhatsApp us before it's gone!",
    tags: "#BurgerBros #Beirut #LebanonFood #SmashBurger #Yalla #Sahtein",
  },
  {
    text: "Tfaddalo... look at that cheddar drip tho 😍🧀\nDouble smash, double trouble habibi!\nDM or WhatsApp — we're waiting for you 💬",
    tags: "#BurgerBros #Lebanon #BeirutEats #CheesePull #Tfaddalo #Yalla",
  },
  {
    text: "Ma tfawwetouwa! 👀\nNew double smash + melted cheddar = your weekend plans sorted ✨\nWhatsApp us, we'll handle the rest 😎",
    tags: "#BurgerBros #Beirut #NewOnTheMenu #WeekendVibes #MaTfawwetouwa #LBFood",
  },
];

/** Short names for footer and menus. */
export const SHORT: Record<string, { en: string; ar: string }> = {
  "ai-food-ad-maker": { en: "Food ad maker", ar: "إعلانات المطاعم" },
  "ai-menu-maker": { en: "Menu maker", ar: "تصميم منيو" },
  "ai-product-photography": { en: "Product photos", ar: "تصوير منتجات" },
  "lebanese-caption-generator": { en: "Lebanese captions", ar: "كابشن لبناني" },
  "talking-photo-ai": { en: "Talking photo", ar: "صورة تتكلم" },
  "before-after-reel-maker": { en: "Before & after reels", ar: "فيديو قبل وبعد" },
  "photo-to-video-ai": { en: "Photo to video", ar: "صورة إلى فيديو" },
  "social-media-post-maker": { en: "Post Pack", ar: "باقة المنشورات" },
  "remove-background": { en: "Remove background", ar: "إزالة الخلفية" },
  "real-estate-photo-ai": { en: "Real estate photos", ar: "صور العقارات" },
};
