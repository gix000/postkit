import { en, type Dict } from "@/lib/dict/en";

// The site is English-only. All copy lives in dict/en.ts.
export const t: Dict = en;

/** Fills {name} placeholders. */
export function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export type { Dict };
