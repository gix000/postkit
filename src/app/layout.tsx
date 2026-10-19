import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: { default: "PostKit — create photos and videos with AI", template: "%s · PostKit" },
  description: "Create photos and videos from a prompt, explore open models, and publish your own.",
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0d0303" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1 pb-28 sm:pb-0">
          {children}
        </main>
        <footer className="hidden sm:block border-t border-rule mt-24">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6 py-8 text-sm text-muted flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span className="flex items-center gap-2"><Logo size={18} glow={false} /> PostKit</span>
            <span>Create photos and videos with open AI models.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
