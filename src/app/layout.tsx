import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, IBM_Plex_Mono, Noto_Naskh_Arabic } from "next/font/google";
import { t } from "@/lib/i18n";
import { site } from "@/lib/env";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--f-display", axes: ["opsz", "SOFT"] });
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--f-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });
// Arabic is only used inside the caption demos, which show the product's Arabic captions.
const arabic = Noto_Naskh_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], variable: "--f-ar" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: t.meta.title,
  description: t.meta.description,
  openGraph: { title: t.meta.title, description: t.meta.description, locale: "en_US" },
};

export const viewport: Viewport = { themeColor: "#15140F", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable} ${arabic.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
