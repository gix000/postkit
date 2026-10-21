import type { Metadata } from "next";
import MenuMaker from "./MenuClient";
import { getSessionUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return { title: lang === "ar" ? "صانع القوائم" : "Menu maker" };
}

export default async function MenuPage() {
  const [{ lang }, user] = await Promise.all([getT(), getSessionUser()]);
  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-10">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "استوديو السوشيال" : "Social studio"}</p>
      <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">{ar ? "صانع القوائم" : "Menu maker"}</h1>
      <p className="text-muted mt-2 mb-8 max-w-[60ch]">
        {ar
          ? "أضف الأطباق والأسعار والصور، واختر الشكل. قائمة بلغتين جاهزة لإنستغرام أو الستوري أو الطباعة. مسودّتك محفوظة على هذا الجهاز."
          : "Add dishes, prices and photos, pick a look. A bilingual menu ready for Instagram, Stories or print. Your draft is kept on this device."}
      </p>
      <MenuMaker signedIn={Boolean(user)} />
    </div>
  );
}
