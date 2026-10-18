import Link from "next/link";
import { t } from "@/lib/i18n";
import { site } from "@/lib/env";
import { Wordmark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__row">
        <div>
          <Wordmark />
          <p className="site-footer__by">{t.footer.by}</p>
        </div>
        <ul className="site-footer__links">
          <li>
            <Link href="/terms">{t.footer.terms}</Link>
          </li>
          {site.whatsapp && (
            <li>
              <a href={`https://wa.me/${site.whatsapp}`} rel="noopener" target="_blank">
                {t.footer.whatsapp}
              </a>
            </li>
          )}
          {site.instagram && (
            <li>
              <a href={`https://instagram.com/${site.instagram}`} rel="noopener" target="_blank">
                {t.footer.instagram}
              </a>
            </li>
          )}
          {site.supportEmail && (
            <li>
              <a href={`mailto:${site.supportEmail}`}>{t.footer.email}</a>
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}
