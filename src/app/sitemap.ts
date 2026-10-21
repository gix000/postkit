import type { MetadataRoute } from "next";
import { SEO_PAGES, seoPath } from "@/lib/seo-pages";

const SITE = "https://www.postkitlb.com";

/** Every public page, with its Arabic twin for the search-engine landing pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const app = ["/", "/templates", "/create", "/social", "/pack", "/talk", "/captions", "/menu", "/feed", "/credits", "/explore"].map((p) => ({
    url: SITE + p,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
  const pair = (slug: string | null) =>
    (["en", "ar"] as const).map((lang) => ({
      url: SITE + seoPath(slug, lang),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: slug ? 0.8 : 0.6,
      alternates: { languages: { en: SITE + seoPath(slug, "en"), ar: SITE + seoPath(slug, "ar") } },
    }));
  return [...app, ...pair(null), ...SEO_PAGES.flatMap((p) => pair(p.slug))];
}
