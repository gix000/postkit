import type { Metadata } from "next";
import TemplateGrid from "@/components/TemplateGrid";
import { TEMPLATES } from "@/lib/templates";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return {
    title: lang === "ar" ? "القوالب" : "Templates",
    description: "One-tap templates for menus, products, real estate and social posts.",
  };
}

export default async function TemplatesPage() {
  const { lang } = await getT();
  const ar = lang === "ar";
  return (
    <div>
      <section className="relative overflow-hidden border-b border-rule">
        <div className="neon-field opacity-60" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-[1240px] px-4 sm:px-6 pt-10 pb-10">
          <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "القوالب" : "Templates"}</p>
          <h1 className="text-[40px] sm:text-[60px] font-extrabold tracking-[-0.03em] leading-[1.02] mt-1 max-w-[16ch]">
            {ar ? "ارفع صورة. احصل على صورة احترافية." : "Upload a photo. Get a pro shot."}
          </h1>
          <p className="text-muted mt-3 max-w-[56ch]">
            {ar
              ? "قوالب جاهزة للمطاعم والمتاجر والعقارات والسوشيال. اختر قالبًا، ارفع صورتك من الهاتف، واضغط إنشاء."
              : "Ready-made looks for restaurants, shops, real estate and social. Pick one, upload a phone photo, tap Create."}
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-6">
        <TemplateGrid templates={TEMPLATES} />
      </section>
    </div>
  );
}
