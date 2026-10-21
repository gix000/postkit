import type { Metadata } from "next";
import type { Lang } from "./catalog";
import { seoPage, seoPath } from "./seo-pages";

function thumb(slug: string) {
  const m = seoPage(slug)?.media;
  if (!m) return undefined;
  return m.kind === "pair" ? m.after : m.kind === "image" ? m.src : m.kind === "video" ? m.poster : "/models/qwen-poster.webp";
}

export function seoMetadata(slug: string, lang: Lang): Metadata {
  const p = seoPage(slug);
  if (!p) return {};
  const c = p[lang];
  const img = thumb(slug);
  return {
    title: { absolute: c.title },
    description: c.description,
    alternates: {
      canonical: seoPath(slug, lang),
      languages: { en: seoPath(slug, "en"), ar: seoPath(slug, "ar"), "x-default": seoPath(slug, "en") },
    },
    openGraph: {
      type: "website",
      siteName: "PostKit",
      title: c.title,
      description: c.description,
      url: seoPath(slug, lang),
      locale: lang === "ar" ? "ar_LB" : "en_US",
      images: img ? [{ url: img, alt: c.alt }] : undefined,
    },
    twitter: { card: "summary_large_image", title: c.title, description: c.description, images: img ? [img] : undefined },
  };
}

export function hubMetadata(lang: Lang): Metadata {
  const ar = lang === "ar";
  const title = ar ? "أدوات ذكاء اصطناعي للمحلات والمطاعم في لبنان | PostKit" : "AI Tools for Restaurants, Shops & Pages | PostKit";
  const description = ar
    ? "إعلانات مطاعم، منيو، صور منتجات، كابشن لبنانية، تحويل صور إلى فيديو وصور تتكلم، بالعربي والإنجليزي. ابدأ مجانًا."
    : "Food ads, menus, product photos, Lebanese captions, photo-to-video and talking photos, in Arabic and English. Start free.";
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: seoPath(null, lang), languages: { en: seoPath(null, "en"), ar: seoPath(null, "ar"), "x-default": seoPath(null, "en") } },
    openGraph: { type: "website", siteName: "PostKit", title, description, url: seoPath(null, lang), locale: ar ? "ar_LB" : "en_US", images: [{ url: "/templates/burger-ad.webp" }] },
  };
}
