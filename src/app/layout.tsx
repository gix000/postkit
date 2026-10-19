import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: { default: "PostKit — open models and datasets", template: "%s · PostKit" },
  description: "Find open models and datasets, publish your own, and run them in the browser.",
};

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
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t border-rule mt-24">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6 py-8 text-sm text-muted flex flex-wrap gap-x-6 gap-y-2 justify-between">
            <span>PostKit Hub</span>
            <span>
              Hub data from the public{" "}
              <a className="underline underline-offset-2" href="https://huggingface.co/docs/hub/api" rel="noreferrer">
                Hugging Face API
              </a>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
