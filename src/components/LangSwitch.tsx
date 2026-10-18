"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LangSwitch({ locale, label, title }: { locale: Locale; label: string; title: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const search = useSearchParams()?.toString();
  const other: Locale = locale === "ar" ? "en" : "ar";
  const target = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${other}`) + (search ? `?${search}` : "");

  return (
    <Link href={target} hrefLang={other} lang={other} title={title} className="lang-switch">
      {label}
    </Link>
  );
}
