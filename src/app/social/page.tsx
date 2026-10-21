import type { Metadata } from "next";
import SocialTools from "./SocialTools";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return { title: lang === "ar" ? "استوديو السوشيال" : "Social studio", description: "Tools for social media pages: post packs, captions, text on photos, reels, feed preview, menus." };
}

export default async function SocialPage() {
  const { lang } = await getT();
  const ar = lang === "ar";
  return (
    <div>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="neon-field opacity-60" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 pb-10">
          <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "استوديو السوشيال" : "Social studio"}</p>
          <h1 className="text-[40px] sm:text-[60px] font-extrabold tracking-[-0.03em] leading-[1.02] mt-1 max-w-[18ch]">
            {ar ? "كل ما تحتاجه صفحتك، في مكان واحد." : "Everything your page needs, in one place."}
          </h1>
          <p className="text-muted mt-3 max-w-[56ch]">
            {ar
              ? "منشورات وستوري وريلز وتعليقات وقوائم. صُمّمت لأصحاب المحلات والمطاعم ومديري الصفحات."
              : "Posts, stories, reels, captions and menus. Built for shop owners, restaurants and page managers."}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-6">
        <SocialTools />
      </section>
    </div>
  );
}
