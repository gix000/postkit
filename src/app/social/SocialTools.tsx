"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18n";
import TextEditor from "@/components/TextEditor";
import ReelMaker from "@/components/ReelMaker";
import { prepareUpload } from "@/lib/image-client";

type Tool = {
  id: string;
  href?: string;
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  badge?: { en: string; ar: string };
  cost: { en: string; ar: string };
  icon: string;
};

const FREE = { en: "Free", ar: "مجاني" };

export const TOOLS: Tool[] = [
  { id: "pack", href: "/pack", icon: "▦", title: { en: "Post Pack", ar: "باقة المنشور" }, body: { en: "One product photo becomes a feed post, a story, a 5-second reel and a caption that all match.", ar: "صورة منتج واحدة تصبح منشورًا وستوري وريل 5 ثوانٍ وتعليقًا متناسقًا." }, badge: { en: "Most popular", ar: "الأكثر طلبًا" }, cost: { en: "16 credits", ar: "16 رصيد" } },
  { id: "captions", href: "/captions", icon: "✎", title: { en: "Captions, Lebanese style", ar: "تعليقات بالأسلوب اللبناني" }, body: { en: "Captions in English, Arabic, Arabizi or a mix, with hashtags and a call to action.", ar: "تعليقات بالإنجليزية أو العربية أو العربيزي أو مزيج، مع هاشتاغات ودعوة للتواصل." }, cost: FREE },
  { id: "text", icon: "Aa", title: { en: "Text on photo", ar: "نص على الصورة" }, body: { en: "Headlines, prices, offer badges and your logo in English or Arabic fonts.", ar: "عناوين وأسعار وشارات عروض وشعارك بخطوط عربية وإنجليزية." }, cost: FREE },
  { id: "reel", icon: "◐", title: { en: "Before/After reel", ar: "ريل قبل/بعد" }, body: { en: "Two photos become a swipe-reveal video. Perfect proof for clients.", ar: "صورتان تصبحان فيديو كشف بالسحب. دليل مثالي لعملائك." }, cost: FREE },
  { id: "feed", href: "/feed", icon: "⊞", title: { en: "Feed preview", ar: "معاينة الصفحة" }, body: { en: "See your posts as an Instagram grid and rearrange them before posting.", ar: "شاهد منشوراتك كشبكة إنستغرام ورتّبها قبل النشر." }, cost: FREE },
  { id: "menu", href: "/menu", icon: "☰", title: { en: "Menu maker", ar: "صانع القوائم" }, body: { en: "Dishes, prices and photos into a designed bilingual menu for print or Instagram.", ar: "أطباق وأسعار وصور في قائمة مصمّمة بلغتين للطباعة أو إنستغرام." }, cost: FREE },
  { id: "occasions", href: "/templates?cat=occasions", icon: "✦", title: { en: "Occasion campaigns", ar: "حملات المناسبات" }, body: { en: "Your product themed for Ramadan, Eid, Christmas, Mother's Day and more.", ar: "منتجك بأجواء رمضان والعيد والميلاد وعيد الأم وغيرها." }, cost: { en: "3 credits", ar: "3 رصيد" } },
  { id: "talk", href: "/talk", icon: "◉", title: { en: "Talking product", ar: "منتج يتكلّم" }, body: { en: "A photo of a person, mascot or product says your line out loud.", ar: "صورة شخص أو شخصية أو منتج تقول جملتك بصوت." }, badge: { en: "New", ar: "جديد" }, cost: { en: "20 credits", ar: "20 رصيد" } },
];

/** Grid of social tools. Text and Before/After open right here from photos on the phone. */
export default function SocialTools() {
  const { lang } = useT();
  const ar = lang === "ar";
  const textInput = useRef<HTMLInputElement>(null);
  const reelInput = useRef<HTMLInputElement>(null);
  const [textSrc, setTextSrc] = useState<string | null>(null);
  const [reelPair, setReelPair] = useState<{ before: string; after: string } | null>(null);

  const card = "tap group glass rounded-[24px] p-5 h-full flex flex-col gap-3 text-start hover:border-cobalt/50 transition-colors";
  const inner = (tool: Tool) => (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="grid place-items-center h-12 w-12 rounded-2xl bg-cobalt/15 text-cobalt text-xl font-bold">{tool.icon}</span>
        {tool.badge && <span className="rounded-full bg-hot text-ink text-[11px] font-bold px-2.5 py-1">{tool.badge[lang]}</span>}
      </span>
      <span className="block text-lg font-bold leading-tight">{tool.title[lang]}</span>
      <span className="block text-sm text-muted flex-1">{tool.body[lang]}</span>
      <span className="flex items-center justify-between text-[13px]">
        <span className="font-semibold text-cobalt">{tool.cost[lang]}</span>
        <span className="font-medium text-ink/80 group-hover:text-ink">{ar ? "افتح ←" : "Open →"}</span>
      </span>
    </>
  );

  return (
    <>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {TOOLS.map((tool, i) => (
          <li key={tool.id} className="rise" style={{ animationDelay: `${i * 35}ms` }}>
            {tool.href ? (
              <Link href={tool.href} className={card}>
                {inner(tool)}
              </Link>
            ) : (
              <button type="button" className={card + " w-full"} onClick={() => (tool.id === "text" ? textInput : reelInput).current?.click()}>
                {inner(tool)}
              </button>
            )}
          </li>
        ))}
      </ul>
      <input
        ref={textInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setTextSrc(await prepareUpload(f));
          e.target.value = "";
        }}
      />
      <input
        ref={reelInput}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []).slice(0, 2);
          e.target.value = "";
          if (files.length < 2) {
            alert(ar ? "اختر صورتين: قبل ثم بعد." : "Pick two photos: the before, then the after.");
            return;
          }
          const [before, after] = await Promise.all(files.map((f) => prepareUpload(f)));
          setReelPair({ before, after });
        }}
      />
      {textSrc && <TextEditor src={textSrc} onClose={() => setTextSrc(null)} />}
      {reelPair && <ReelMaker before={reelPair.before} after={reelPair.after} onClose={() => setReelPair(null)} />}
    </>
  );
}
