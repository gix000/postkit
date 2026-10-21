import type { Metadata } from "next";
import Link from "next/link";
import TalkingProduct from "./TalkingProduct";
import { getSessionUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return { title: lang === "ar" ? "منتج يتكلّم" : "Talking product" };
}

export default async function TalkPage() {
  const [{ lang }, user] = await Promise.all([getT(), getSessionUser()]);
  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-10">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "استوديو السوشيال · جديد" : "Social studio · New"}</p>
      <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">{ar ? "اجعل صورتك تتكلّم" : "Make your photo talk"}</h1>
      <p className="text-muted mt-2 mb-8 max-w-[60ch]">
        {ar
          ? "ارفع صورة بوجه، اكتب جملة بالعربي أو الإنجليزي، واحصل على فيديو يقولها بصوت وشفاه متحركة. مثالي للإعلانات والترحيب والعروض."
          : "Upload a photo with a face, type a line in Arabic or English, and get a video that says it out loud with moving lips. Great for ads, welcomes and offers."}
      </p>
      {user ? (
        <TalkingProduct />
      ) : (
        <div className="glass rounded-2xl px-6 py-10">
          <p className="font-semibold">{ar ? "سجّل الدخول لتجربتها" : "Sign in to try it"}</p>
          <Link href="/login?next=/talk" className="tap btn-neon mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
            {ar ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </div>
      )}
    </div>
  );
}
