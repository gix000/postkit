import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/components/SeoLanding";
import { SEO_PAGES, seoPage } from "@/lib/seo-pages";
import { seoMetadata } from "@/lib/seo-meta";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/ar/use/[slug]">): Promise<Metadata> {
  return seoMetadata((await params).slug, "ar");
}

export default async function Page({ params }: PageProps<"/ar/use/[slug]">) {
  const page = seoPage((await params).slug);
  if (!page) notFound();
  return <SeoLanding page={page} lang="ar" />;
}
