import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Link from "next/link";
import Header from "@/components/Header";
import ScrollLock from "@/components/ScrollLock";
import Logo from "@/components/Logo";
import { I18nProvider, LangSwitch } from "@/components/I18n";
import { ToastProvider } from "@/components/Toast";
import { getT } from "@/lib/i18n/server";
import { SEO_PAGES, SHORT, seoPath } from "@/lib/seo-pages";
import localFont from "next/font/local";

// Self-hosted: no request to Google, preloaded, with size-matched fallbacks so text doesn't jump.
const bricolage = localFont({ src: "../fonts/bricolage.woff2", weight: "200 800", variable: "--font-bricolage", display: "swap" });
const naskh = localFont({
  src: "../fonts/naskh-arabic.woff2",
  weight: "400 700",
  variable: "--font-naskh",
  display: "swap",
  preload: false,
});
const jbmono = localFont({
  src: "../fonts/jetbrains-mono.woff2",
  weight: "100 800",
  variable: "--font-jbmono",
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const [{ lang }, h] = await Promise.all([getT(), headers()]);
  const path = h.get("x-pk-path") ?? "/";
  const shared: Metadata = {
    metadataBase: new URL("https://www.postkitlb.com"),
    alternates: { canonical: path },
    applicationName: "PostKit",
    openGraph: { siteName: "PostKit", type: "website", images: [{ url: "/templates/burger-ad.webp" }] },
    twitter: { card: "summary_large_image" },
  };
  return lang === "ar"
    ? {
        ...shared,
        title: { default: "PostKit — أنشئ صورًا وفيديوهات بالذكاء الاصطناعي", template: "%s · PostKit" },
        description: "أنشئ صورًا وفيديوهات من وصف أو من صورتك، أزل الخلفيات، وحرّك الصور.",
      }
    : {
        ...shared,
        title: { default: "PostKit — create photos and videos with AI", template: "%s · PostKit" },
        description: "Create photos and videos from a prompt or your own photo, remove backgrounds, and animate pictures.",
      };
}

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0d0303" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang, t } = await getT();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className={`h-full ${bricolage.variable} ${naskh.variable} ${jbmono.variable}`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>
          <ToastProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
          >
            {t.skip}
          </a>
          <ScrollLock />
          <Header />
          <main id="main" className="flex-1 pb-28 sm:pb-0">
            {children}
          </main>
          <footer className="hidden sm:block border-t border-rule mt-24">
            <div className="mx-auto max-w-[1240px] px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-8 text-sm">
              <div className="col-span-2 md:col-span-1">
                <span className="flex items-center gap-2 font-semibold text-[16px]">
                  <Logo size={22} glow={false} /> PostKit
                </span>
                <p className="text-muted mt-2 max-w-[34ch]">{t.footer}</p>
              </div>
              <nav aria-label="Product" className="flex flex-col gap-2 text-muted">
                <span className="text-ink font-semibold mb-1">{lang === "ar" ? "المنتج" : "Product"}</span>
                <Link href="/create" className="hover:text-ink">{t.nav.create}</Link>
                <Link href="/templates" className="hover:text-ink">{lang === "ar" ? "القوالب" : "Templates"}</Link>
                <Link href="/#models" className="hover:text-ink">{t.nav.models}</Link>
                <Link href="/explore" className="hover:text-ink">{t.nav.explore}</Link>
              </nav>
              <nav aria-label="Tools" className="flex flex-col gap-2 text-muted">
                <span className="text-ink font-semibold mb-1">{lang === "ar" ? "الأدوات" : "Tools"}</span>
                {SEO_PAGES.slice(0, 6).map((p) => (
                  <Link key={p.slug} href={seoPath(p.slug, lang)} prefetch={false} className="hover:text-ink">{SHORT[p.slug][lang]}</Link>
                ))}
                <Link href={seoPath(null, lang)} prefetch={false} className="hover:text-ink">{lang === "ar" ? "كل الأدوات" : "All tools"}</Link>
              </nav>
              <nav aria-label="Account" className="flex flex-col gap-2 text-muted">
                <span className="text-ink font-semibold mb-1">{lang === "ar" ? "الحساب" : "Account"}</span>
                <Link href="/library" className="hover:text-ink">{t.nav.library}</Link>
                <Link href="/credits" className="hover:text-ink">{t.nav.credits}</Link>
                <Link href="/#faq" className="hover:text-ink">{lang === "ar" ? "الأسئلة الشائعة" : "FAQ"}</Link>
              </nav>
              <div className="flex flex-col gap-2 text-muted">
                <span className="text-ink font-semibold mb-1">{lang === "ar" ? "تواصل" : "Contact"}</span>
                {process.env.NEXT_PUBLIC_WHATSAPP && (
                  <a href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="hover:text-ink">
                    WhatsApp
                  </a>
                )}
                <LangSwitch className="self-start" />
              </div>
            </div>
            <div className="border-t border-rule">
              <p className="mx-auto max-w-[1240px] px-4 sm:px-6 py-4 text-xs text-muted">© {new Date().getFullYear()} PostKit · Beirut</p>
            </div>
          </footer>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
