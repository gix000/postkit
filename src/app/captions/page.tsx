import type { Metadata } from "next";
import Link from "next/link";
import CaptionWriter from "./CaptionsClient";
import { getSessionUser } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { first } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return { title: lang === "ar" ? "كاتب التعليقات" : "Caption writer" };
}

export default async function CaptionsPage({ searchParams }: PageProps<"/captions">) {
  const [{ lang }, user, sp] = await Promise.all([getT(), getSessionUser(), searchParams]);
  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-10">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "استوديو السوشيال" : "Social studio"}</p>
      <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">{ar ? "تعليقات بالأسلوب اللبناني" : "Captions, Lebanese style"}</h1>
      <p className="text-muted mt-2 mb-8 max-w-[60ch]">
        {ar
          ? "بالعربي اللبناني أو العربيزي أو الإنجليزي أو مزيج بيروتي، مع هاشتاغات ودعوة للتواصل. مجانًا."
          : "In Lebanese Arabic, Arabizi, English or the Beirut mix, with hashtags and a call to action. Free."}
      </p>
      {user ? (
        <CaptionWriter initialAbout={(first(sp.about) ?? "").slice(0, 600)} />
      ) : (
        <div className="glass rounded-2xl px-6 py-10">
          <p className="font-semibold">{ar ? "سجّل الدخول لكتابة التعليقات مجانًا" : "Sign in to write captions for free"}</p>
          <Link href="/login?next=/captions" className="tap btn-neon mt-4 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">
            {ar ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </div>
      )}
    </div>
  );
}
