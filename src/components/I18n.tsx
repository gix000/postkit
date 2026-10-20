"use client";
import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/catalog";
import { DICTS, type Dict } from "@/lib/i18n/dict";

const Ctx = createContext<Lang>("en");

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export function useT(): { lang: Lang; t: Dict } {
  const lang = useContext(Ctx);
  return { lang, t: DICTS[lang] };
}

/** Switches English ⇄ Arabic and remembers the choice for a year. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, t } = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next: Lang = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      lang={next}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      disabled={pending}
      onClick={() => {
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
        start(() => router.refresh());
      }}
      className={`h-10 px-3 rounded-full text-sm font-semibold text-muted hover:text-ink hover:bg-ink/5 ${pending ? "opacity-60" : ""} ${className}`}
    >
      {t.switchTo}
    </button>
  );
}
