import type { Metadata } from "next";

// Copies of Hugging Face listings from PostKit's earlier version: still usable, but kept out of
// Google so search engines judge the site by its own pages.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
