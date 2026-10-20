import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Logo from "@/components/Logo";
import { I18nProvider, LangSwitch } from "@/components/I18n";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return lang === "ar"
    ? {
        title: { default: "PostKit — أنشئ صورًا وفيديوهات بالذكاء الاصطناعي", template: "%s · PostKit" },
        description: "أنشئ صورًا وفيديوهات من وصف أو من صورتك، أزل الخلفيات، وحرّك الصور.",
      }
    : {
        title: { default: "PostKit — create photos and videos with AI", template: "%s · PostKit" },
        description: "Create photos and videos from a prompt or your own photo, remove backgrounds, and animate pictures.",
      };
}

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0d0303" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { lang, t } = await getT();
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} className="h-full">
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
          >
            {t.skip}
          </a>
          <Header />
          <main id="main" className="flex-1 pb-28 sm:pb-0">
            {children}
          </main>
          <footer className="hidden sm:block border-t border-rule mt-24">
            <div className="mx-auto max-w-[1240px] px-4 sm:px-6 py-8 text-sm text-muted flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
              <span className="flex items-center gap-2">
                <Logo size={18} glow={false} /> PostKit
              </span>
              <span>{t.footer}</span>
              <LangSwitch />
            </div>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
