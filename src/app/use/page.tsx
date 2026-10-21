import type { Metadata } from "next";
import { SeoHub } from "@/components/SeoLanding";
import { hubMetadata } from "@/lib/seo-meta";

export const metadata: Metadata = hubMetadata("en");

export default function Page() {
  return <SeoHub lang="en" />;
}
