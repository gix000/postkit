import type { Metadata } from "next";
import Link from "next/link";
import PostPack from "./PostPack";
import { getBalance } from "@/lib/credits";
import { getSessionUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return { title: lang === "ar" ? "باقة المنشور" : "Post Pack" };
}

export default async function PackPage() {
  const [{ lang }, user, balance] = await Promise.all([getT(), getSessionUser(), getBalance()]);
  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-10">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "استوديو السوشيال" : "Social studio"}</p>
      <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">{ar ? "باقة المنشور" : "Post Pack"}</h1>
      <p className="text-muted mt-2 mb-8 max-w-[60ch]">
        {ar
          ? "صورة منتج واحدة تصبح منشورًا 4:5 وستوري 9:16 وريل 5 ثوانٍ وتعليقًا، كلها بنفس الأسلوب. أسبوع محتوى بنقرة."
          : "One product photo becomes a 4:5 feed post, a 9:16 story, a 5-second reel and a caption, all in the same look. A week of content in one tap."}
      </p>
      {user ? (
        <PostPack balance={balance} />
      ) : (
        <div className="glass rounded-2xl px-6 py-10">
          <p className="font-semibold">{ar ? "سجّل الدخول لصنع باقتك" : "Sign in to make your pack"}</p>
          <Link href="/login?next=/pack" className="tap btn-neon mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
            {ar ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </div>
      )}
    </div>
  );
}
