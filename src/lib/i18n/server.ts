import "server-only";
import { cookies, headers } from "next/headers";
import type { Lang } from "../catalog";
import { DICTS, type Dict } from "./dict";

export const LANG_COOKIE = "lang";

/** The visitor's language: their saved choice, else Arabic if their browser prefers it, else English. */
export async function getLang(): Promise<Lang> {
  const forced = (await headers()).get("x-pk-lang");
  if (forced === "ar" || forced === "en") return forced;
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (saved === "ar" || saved === "en") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  return /^ar\b/i.test(accept.trim()) ? "ar" : "en";
}

export async function getT(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: DICTS[lang] };
}
