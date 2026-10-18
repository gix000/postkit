import { en, type Dict } from "@/lib/dict/en";
import { ar } from "@/lib/dict/ar";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
/** Used when the browser asks for neither Arabic nor English. */
export const defaultLocale: Locale = "en";

/** Picks ar or en from an Accept-Language header, honouring q-values. */
export function pickLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { lang: tag.toLowerCase().slice(0, 2), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  const hit = ranked.find((r) => r.lang === "ar" || r.lang === "en");
  return (hit?.lang as Locale | undefined) ?? defaultLocale;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function dir(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getDict(locale: Locale): Dict {
  return locale === "ar" ? ar : en;
}

/** Fills {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function formatDate(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-LB" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export type { Dict };
