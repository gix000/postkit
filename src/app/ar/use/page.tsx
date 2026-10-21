import type { Metadata } from "next";
import { SeoHub } from "@/components/SeoLanding";
import { hubMetadata } from "@/lib/seo-meta";

export const metadata: Metadata = hubMetadata("ar");

export default function Page() {
  return <SeoHub lang="ar" />;
}
