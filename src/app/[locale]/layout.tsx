import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono, Noto_Naskh_Arabic } from "next/font/google";
import { dir, getDict, isLocale } from "@/lib/i18n";
import { site } from "@/lib/env";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "../globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--f-display", axes: ["opsz", "SOFT"] });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--f-ar" });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDict(locale);
  return {
    metadataBase: new URL(site.url),
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: { en: "/en", ar: "/ar" } },
    openGraph: { title: t.meta.title, description: t.meta.description, locale: locale === "ar" ? "ar_LB" : "en_US" },
  };
}

export const viewport: Viewport = { themeColor: "#15140F", colorScheme: "dark" };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale);

  return (
    <html lang={locale} dir={dir(locale)} className={`${display.variable} ${body.variable} ${mono.variable} ${arabic.variable}`}>
      <body>
        <a className="skip" href="#main">
          {locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}
        </a>
        <SiteHeader locale={locale} t={t} />
        <main id="main">{children}</main>
        <SiteFooter locale={locale} t={t} />
      </body>
    </html>
  );
}
