import type { Text } from "./catalog";

export type PromptKind = "photo" | "edit" | "video" | "animate";

export type PromptIdea = { kind: PromptKind; cat: string; title: Text; prompt: string };

export const PROMPT_CATS: Record<PromptKind, { id: string; name: Text }[]> = {
  photo: [
    { id: "food", name: { en: "Food & drinks", ar: "طعام ومشروبات" } },
    { id: "product", name: { en: "Products", ar: "منتجات" } },
    { id: "fashion", name: { en: "Fashion & beauty", ar: "أزياء وجمال" } },
    { id: "places", name: { en: "Places & Lebanon", ar: "أماكن ولبنان" } },
    { id: "people", name: { en: "Portraits", ar: "بورتريه" } },
    { id: "text", name: { en: "Posters & text", ar: "ملصقات ونصوص" } },
    { id: "art", name: { en: "Art & 3D", ar: "فن و3D" } },
  ],
  edit: [
    { id: "scene", name: { en: "New scene", ar: "مشهد جديد" } },
    { id: "light", name: { en: "Light & mood", ar: "إضاءة وأجواء" } },
    { id: "style", name: { en: "Style", ar: "أسلوب" } },
  ],
  video: [
    { id: "food", name: { en: "Food & products", ar: "طعام ومنتجات" } },
    { id: "places", name: { en: "Places", ar: "أماكن" } },
    { id: "mood", name: { en: "Mood & abstract", ar: "أجواء وتجريد" } },
  ],
  animate: [{ id: "motion", name: { en: "Camera & motion", ar: "كاميرا وحركة" } }],
};

const p = (kind: PromptKind, cat: string, en: string, ar: string, prompt: string): PromptIdea => ({ kind, cat, title: { en, ar }, prompt });

/**
 * Polished prompts written like a photographer's brief: subject, setting, light, lens, mood.
 * Kept in English because the models follow English best; Arabic titles help people pick.
 */
export const PROMPTS: PromptIdea[] = [
  // ── Photo · Food & drinks
  p("photo", "food", "Manoushe at sunrise", "منقوشة مع الشروق",
    "Overhead editorial food photograph of a fresh zaatar manoushe on a rustic olive-wood board, glistening olive oil, a small bowl of labneh with mint, cucumbers and olives on the side, soft directional morning window light from the left, warm natural tones, crumbs on linen, shot on a 50mm lens at f/4, Bon Appétit magazine style, no text"),
  p("photo", "food", "Iced latte, café window", "لاتيه مثلّج على النافذة",
    "Lifestyle photograph of an iced oat latte in a tall ribbed glass on a white marble café table beside a sunny window, condensation droplets, swirling espresso layers, soft dappled shadows from a plant, shallow depth of field with a creamy blurred café interior, 85mm lens at f/2, fresh and airy, no text"),
  p("photo", "food", "Burger, dark & dramatic", "برغر بإضاءة درامية",
    "Hero advertising shot of a double smash burger with melted cheddar dripping over the patty, toasted brioche bun with sesame seeds, crisp lettuce and pickles, on a dark slate surface, dramatic side light with a warm rim light, wisps of steam, glossy textures, low angle, 100mm macro lens, high-end fast-food campaign look, no text"),
  p("photo", "food", "Lebanese mezze spread", "سفرة مازة لبنانية",
    "Top-down photograph of a generous Lebanese mezze spread on a long wooden table: hummus with paprika and olive oil, tabbouleh, fattoush, moutabal, grilled halloumi and warm pita, hands reaching in, soft late-afternoon light, rich colors, authentic and abundant, editorial food magazine style, no text"),
  p("photo", "food", "Chocolate cake slice", "قطعة كيك شوكولا",
    "Close-up dessert photograph of a slice of dark chocolate layer cake with a glossy ganache drip and a few raspberries, on a matte ceramic plate, a fork resting beside it, moody chiaroscuro lighting from the side, deep brown and burgundy palette, 100mm macro lens at f/2.8, luxurious patisserie feel, no text"),
  p("photo", "food", "Fresh juice splash", "عصير مع رذاذ",
    "High-speed commercial photograph of a glass of fresh orange juice with orange slices splashing into it, droplets frozen mid-air, bright seamless sunny-yellow background, crisp studio strobe lighting, ultra sharp, vibrant and refreshing, beverage advertising style, no text"),

  // ── Photo · Products
  p("photo", "product", "Perfume on wet stone", "عطر على حجر مبلّل",
    "Luxury fragrance advertising photograph of a faceted glass perfume bottle standing on wet black volcanic stone, water droplets on the glass, a single soft spotlight from above, lime-green and hot-pink rim lights tracing the edges, deep black background, mirror-like reflections, 100mm lens, ultra sharp, high-end campaign, no text"),
  p("photo", "product", "Skincare on travertine", "عناية بالبشرة على ترافرتين",
    "Minimal beauty product photograph of a frosted glass serum bottle and a jar of cream on stacked travertine blocks, soft beige backdrop, sharp palm-leaf shadows from late sun, warm neutral palette, clean composition with negative space, 85mm lens, editorial skincare brand style, no text"),
  p("photo", "product", "Sneaker floating", "حذاء رياضي طائر",
    "Dynamic studio product photograph of a white running sneaker floating mid-air at a slight angle, laces flowing, small fragments of colored foam drifting around it, gradient background from deep navy to electric blue, crisp rim lighting, sharp details on the knit texture, sportswear campaign style, no text"),
  p("photo", "product", "Watch on marble", "ساعة على رخام",
    "Luxury watch advertising photograph of a gold automatic wristwatch resting on polished black marble, the dial catching a precise beam of light, subtle reflections, dark moody background with a soft vignette, macro detail on the hands and indices, 100mm macro lens at f/5.6, Swiss watchmaker campaign look, no text"),
  p("photo", "product", "Phone on a desk setup", "هاتف على مكتب عصري",
    "Lifestyle tech photograph of a sleek smartphone on a minimal walnut desk next to a ceramic coffee mug, wireless earbuds and a small plant, soft daylight from a window, clean modern workspace, muted earthy tones, shallow depth of field, 35mm lens, premium tech brand aesthetic, no text"),
  p("photo", "product", "Candle in a cozy room", "شمعة في أجواء دافئة",
    "Cozy product photograph of a handmade soy candle in an amber glass jar, flame glowing, on a linen-covered side table with a stack of books and dried pampas grass, warm evening lamp light, soft bokeh fairy lights in the background, intimate hygge mood, 50mm lens at f/1.8, no text"),

  // ── Photo · Fashion & beauty
  p("photo", "fashion", "Golden-hour street style", "ستايل الشارع وقت الغروب",
    "Street-style fashion photograph of a young woman in an oversized beige trench coat and white sneakers walking across a sunlit street in Gemmayzeh, Beirut, colorful old facades and stairs behind her, golden-hour backlight, natural candid pose, 85mm lens at f/2, film-like warm tones, Vogue street-style feel"),
  p("photo", "fashion", "Studio beauty close-up", "بورتريه جمال في الاستوديو",
    "Beauty campaign close-up portrait of a woman with glowing dewy skin, soft glossy lips and natural brows, clean butterfly lighting with a large softbox, subtle catchlights, neutral grey backdrop, sharp focus on the eyes, 100mm lens, high-end cosmetics advertising style"),
  p("photo", "fashion", "Menswear on rooftop", "أزياء رجالية على السطح",
    "Editorial menswear photograph of a man in a tailored charcoal suit with an open collar standing on a Beirut rooftop at blue hour, city lights and the sea behind him, cinematic teal and orange grading, soft key light on his face, confident pose, 50mm lens, GQ magazine style"),
  p("photo", "fashion", "Jewelry on silk", "مجوهرات على حرير",
    "Luxury jewelry photograph of a delicate gold necklace with a small emerald pendant draped over rippling champagne silk, soft diffused light with sparkling highlights, shallow depth of field, elegant and refined, 100mm macro lens, fine-jewelry brand campaign, no text"),

  // ── Photo · Places & Lebanon
  p("photo", "places", "Raouché at sunset", "الروشة عند الغروب",
    "Cinematic landscape photograph of the Raouché Pigeon Rocks in Beirut at sunset, the sea glowing gold and pink, gentle waves around the rocks, soft haze, a few seagulls, wide-angle 24mm lens, long exposure smoothing the water, National Geographic travel style, no text"),
  p("photo", "places", "Byblos harbour, blue hour", "مرفأ جبيل",
    "Travel photograph of the old Byblos fishing harbour at blue hour, small wooden boats with their lights on, ancient stone walls reflected in calm water, warm lamps against the deep blue sky, 35mm lens, tranquil and timeless mood, no text"),
  p("photo", "places", "Cedars in the snow", "الأرز تحت الثلج",
    "Majestic winter landscape photograph of ancient cedar trees covered in fresh snow in the Lebanese mountains, soft morning light breaking through mist, deep green branches against white, peaceful and grand, telephoto compression, 70-200mm lens, fine-art nature photography, no text"),
  p("photo", "places", "Boutique hotel room", "غرفة فندق بوتيك",
    "Interior architecture photograph of a boutique hotel bedroom with a linen bed, arched window overlooking the Mediterranean, terracotta tiles, rattan chair and a vase of olive branches, soft morning light, warm Mediterranean palette, straight vertical lines, wide 24mm lens, Architectural Digest style"),

  // ── Photo · Portraits
  p("photo", "people", "Professional headshot", "صورة شخصية مهنية",
    "Professional corporate headshot of a confident smiling person in a navy blazer, soft natural window light from the side, softly blurred modern office background, sharp eyes, natural skin texture, 85mm lens at f/2.2, LinkedIn-ready, clean and approachable"),
  p("photo", "people", "Chef in the kitchen", "طاهٍ في المطبخ",
    "Documentary-style portrait of a chef plating a dish in a busy restaurant kitchen, focused expression, steam rising, warm tungsten light with cool accents from steel surfaces, candid moment, 35mm lens, shallow depth of field, authentic behind-the-scenes feel"),
  p("photo", "people", "Neon rain portrait", "بورتريه نيون تحت المطر",
    "Cinematic night portrait of a young man in the rain on a city street, lime-green and magenta neon signs reflecting on wet skin and the pavement, water droplets in the air, shallow depth of field, 50mm lens at f/1.4, moody Blade Runner atmosphere"),

  // ── Photo · Posters & text
  p("photo", "text", "Grand opening poster", "ملصق افتتاح",
    'Elegant grand-opening poster with the headline "GRAND OPENING" and the line "This Friday · 7 PM", gold foil lettering on deep emerald green, art-deco frame and fine line ornaments, soft spotlight glow, premium event design, centered layout'),
  p("photo", "text", "Café menu board", "لوح قائمة مقهى",
    'Photograph of a black chalkboard café menu on a brick wall with the title "TODAY\'S COFFEE" in hand-lettered white chalk and three short lines "Espresso", "Latte", "Cold Brew", warm café lights around it, realistic chalk texture'),
  p("photo", "text", "Neon sign", "لافتة نيون",
    'Realistic photograph of a glowing neon sign that says "OPEN LATE" in pink cursive letters mounted on a dark tiled wall, soft glow and reflections, slight haze, night-time urban mood, sharp lettering'),
  p("photo", "text", "Ramadan greeting", "تهنئة رمضان",
    'Elegant Ramadan greeting card design with the text "Ramadan Kareem", a glowing crescent moon and hanging lanterns, deep navy night sky with soft gold accents, delicate Islamic geometric patterns, warm magical light, centered composition'),

  // ── Photo · Art & 3D
  p("photo", "art", "3D clay character", "شخصية 3D من الطين",
    "Cute 3D claymation-style character of a small smiling cedar tree with tiny arms waving, soft pastel background, studio lighting with gentle shadows, matte clay textures with fingerprints, playful Pixar-like charm, centered, high detail render"),
  p("photo", "art", "Isometric shop", "متجر بأسلوب أيزومتري",
    "Isometric 3D illustration of a tiny Lebanese corner bakery with a striped awning, bread in the window, potted plants and a bicycle outside, soft pastel colors, clean geometry, warm lights inside, cozy miniature diorama style, white background"),
  p("photo", "art", "Watercolor Beirut", "بيروت بالألوان المائية",
    "Loose watercolor illustration of an old Beirut street with arched windows, bougainvillea and a vintage car, soft washes of terracotta, teal and pink, visible paper texture, delicate ink lines, dreamy travel-sketch style"),
  p("photo", "art", "Abstract glass shapes", "أشكال زجاجية تجريدية",
    "Abstract 3D render of translucent glass shapes and soft blobs floating in space, iridescent refractions in lime green and hot pink, smooth gradients, studio lighting, ultra clean, premium tech wallpaper aesthetic"),

  // ── Edit your photo · New scene
  p("edit", "scene", "Marble kitchen, morning", "مطبخ رخام صباحًا",
    "Place this product on a white marble kitchen counter beside a window with soft morning light, a sprig of fresh herbs and a linen towel nearby, gentle natural shadows, shallow depth of field. Keep the product exactly the same. No text."),
  p("edit", "scene", "Pure white catalog", "خلفية بيضاء للكتالوج",
    "Put this product on a pure white seamless studio background with a soft natural shadow underneath, even diffused lighting, e-commerce catalog photo. Keep the product exactly the same. No text."),
  p("edit", "scene", "Beach at golden hour", "شاطئ وقت الغروب",
    "Place this on smooth sand at a Mediterranean beach during golden hour, gentle waves softly blurred behind, warm sunlight with long shadows, summer lifestyle mood. Keep the main subject exactly the same. No text."),
  p("edit", "scene", "Luxury podium", "منصة فاخرة",
    "Place this product on a round travertine podium against a soft sand-colored backdrop with palm-leaf shadows, warm directional light, luxury advertising photo. Keep the product exactly the same. No text."),
  p("edit", "scene", "Modern living room", "صالون عصري",
    "Place this in a bright modern living room with a linen sofa, oak floor and large windows, soft daylight, styled interior photography, natural scale and shadows. Keep the main subject exactly the same."),

  // ── Edit · Light & mood
  p("edit", "light", "Night with neon", "ليل ونيون",
    "Turn the scene into night with lime-green and hot-pink neon light reflecting on all surfaces, light haze, rich contrast, cinematic mood. Keep the subject and composition the same."),
  p("edit", "light", "Bright & airy", "مشرق ومنعش",
    "Relight this photo to be bright and airy: soft natural daylight, lifted shadows, clean whites, gentle warmth, fresh magazine look. Keep everything in the photo the same."),
  p("edit", "light", "Golden-hour glow", "توهّج الغروب",
    "Relight this photo with warm golden-hour sunlight coming from the side, long soft shadows, a gentle glow and slightly warmer colors. Keep the subject and composition the same."),
  p("edit", "light", "Winter snow", "شتاء وثلج",
    "Change the season to winter: soft falling snow, a light snow layer on surfaces, cool blue daylight with warm accents. Keep the main subject exactly the same."),

  // ── Edit · Style
  p("edit", "style", "Watercolor painting", "لوحة مائية",
    "Turn this photo into a delicate watercolor painting with soft washes, visible paper texture and fine ink outlines, keeping the same composition and subject."),
  p("edit", "style", "3D cartoon", "كرتون 3D",
    "Turn this into a cute 3D animated movie style render with soft lighting, smooth materials and playful proportions, keeping the same pose, colors and composition."),
  p("edit", "style", "Vintage film", "فيلم قديم",
    "Give this photo a vintage 35mm film look: warm faded colors, soft grain, gentle halation around highlights, slight vignette. Keep the content the same."),

  // ── Video · Food & products
  p("video", "food", "Coffee pour, slow motion", "صب القهوة ببطء",
    "Macro slow-motion shot of fresh espresso pouring into a glass of iced milk, swirling caramel-brown clouds, ice cubes glistening, soft window light, shallow depth of field, cinematic café commercial"),
  p("video", "food", "Burger hero turn", "برغر يدور",
    "A juicy double cheeseburger slowly rotating on a dark slate turntable, melted cheese glistening, steam rising, dramatic rim light, camera slowly pushing in, premium fast-food commercial"),
  p("video", "food", "Perfume in water", "عطر في الماء",
    "Slow-motion shot of a glass perfume bottle dropping into dark water, a crown splash of droplets rising around it, lime and pink rim light, deep black background, luxury fragrance commercial"),
  p("video", "food", "Product reveal", "كشف المنتج",
    "Elegant product reveal: soft fabric slides away to uncover a sleek bottle on a stone pedestal, warm spotlight, floating dust particles catching the light, slow cinematic dolly in"),

  // ── Video · Places
  p("video", "places", "Drone over the coast", "درون فوق الساحل",
    "Smooth aerial drone shot flying low over the Mediterranean coastline at golden hour toward rocky cliffs, waves breaking gently, warm sunlight and long shadows, cinematic travel film"),
  p("video", "places", "Rainy Beirut night", "بيروت الماطرة ليلًا",
    "Camera gliding forward through a narrow Beirut street at night in the rain, neon shop signs reflecting on wet cobblestones, people with umbrellas passing, moody cinematic atmosphere"),
  p("video", "places", "Mountain sunrise", "شروق في الجبل",
    "Time-lapse of the sun rising over snowy Lebanese mountains, a sea of clouds flowing through the valleys, colors shifting from deep blue to gold, epic and calm"),

  // ── Video · Mood & abstract
  p("video", "mood", "Liquid gold abstract", "تجريد ذهبي سائل",
    "Abstract macro shot of liquid gold and black ink swirling together in slow motion, glossy reflections, elegant flowing shapes, luxury brand intro"),
  p("video", "mood", "Neon tunnel", "نفق نيون",
    "Camera flying through a futuristic tunnel of lime-green and hot-pink neon light rings, smooth forward motion, light haze and lens flares, energetic tech intro"),

  // ── Animate · Camera & motion
  p("animate", "motion", "Slow push-in", "اقتراب بطيء",
    "Slow cinematic camera push-in toward the subject, soft light gently shifting across the scene, subtle natural motion, smooth and steady"),
  p("animate", "motion", "Product orbit", "دوران حول المنتج",
    "Camera slowly orbits around the product, studio lights glinting across its surfaces, soft reflections moving, premium commercial feel"),
  p("animate", "motion", "Breeze & life", "نسيم وحياة",
    "A gentle breeze moves hair, fabric and leaves naturally, soft sunlight flickers, the subject breathes and blinks subtly, calm lifelike motion"),
  p("animate", "motion", "Steam & sparkle", "بخار ولمعان",
    "Steam rises softly, small sparkles of light drift through the air, the camera drifts slightly to the side, warm cozy atmosphere"),
  p("animate", "motion", "Parallax depth", "عمق متحرك",
    "Subtle parallax camera move revealing depth, foreground slides gently past the subject, background shifts slowly, cinematic 3D feel"),
];

export function promptsFor(kind: PromptKind) {
  return PROMPTS.filter((x) => x.kind === kind);
}
