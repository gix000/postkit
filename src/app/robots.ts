import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/auth/", "/library", "/settings", "/login"] }],
    sitemap: "https://www.postkitlb.com/sitemap.xml",
    host: "https://www.postkitlb.com",
  };
}
