import Link from "next/link";
import { t } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { Wordmark } from "@/components/Wordmark";

export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="site-header">
      <div className="wrap site-header__row">
        <Link href="/" className="site-header__brand" aria-label="PostKit">
          <Wordmark />
        </Link>
        <nav className="site-header__nav" aria-label="Main">
          <Link href="/#tools">{t.nav.tools}</Link>
          <Link href="/#pricing">{t.nav.pricing}</Link>
          <Link href="/#faq">{t.nav.faq}</Link>
        </nav>
        <div className="site-header__end">
          <Link className="btn btn--quiet" href={user ? "/account" : "/login"}>
            {user ? t.nav.account : t.nav.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
