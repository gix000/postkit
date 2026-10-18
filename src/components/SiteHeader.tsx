import { Suspense } from "react";
import Link from "next/link";
import type { Dict, Locale } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { LangSwitch } from "@/components/LangSwitch";
import { Wordmark } from "@/components/Wordmark";

export async function SiteHeader({ locale, t }: { locale: Locale; t: Dict }) {
  const user = await getUser();
  const home = `/${locale}`;

  return (
    <header className="site-header">
      <div className="wrap site-header__row">
        <Link href={home} className="site-header__brand" aria-label="PostKit">
          <Wordmark />
        </Link>
        <nav className="site-header__nav" aria-label={locale === "ar" ? "التنقّل" : "Main"}>
          <Link href={`${home}#tools`}>{t.nav.tools}</Link>
          <Link href={`${home}#pricing`}>{t.nav.pricing}</Link>
          <Link href={`${home}#faq`}>{t.nav.faq}</Link>
        </nav>
        <div className="site-header__end">
          <Suspense fallback={<Link className="lang-switch" href={`/${locale === "ar" ? "en" : "ar"}`}>{t.nav.switchTo}</Link>}>
            <LangSwitch locale={locale} label={t.nav.switchTo} title={t.nav.switchLabel} />
          </Suspense>
          <Link className="btn btn--quiet" href={user ? `${home}/account` : `${home}/login`}>
            {user ? t.nav.account : t.nav.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
