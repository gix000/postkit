import Link from "next/link";
import type { Lang } from "@/lib/catalog";
import { WELCOME_CREDITS } from "@/lib/catalog";

type T = { en: string; ar: string };
const tx = (v: T, lang: Lang) => v[lang];

const TRUST: T[] = [
  { en: "No design skills needed", ar: "لا تحتاج خبرة في التصميم" },
  { en: "English & العربية", ar: "العربية و English" },
  { en: `${WELCOME_CREDITS} free credits to start`, ar: `${WELCOME_CREDITS} رصيد مجاني للبداية` },
  { en: "Pay on WhatsApp", ar: "الدفع عبر واتساب" },
  { en: "Credits never expire", ar: "الرصيد لا تنتهي صلاحيته" },
];

/** A thin row of reassurances under the hero. */
export function TrustBar({ lang }: { lang: Lang }) {
  return (
    <div className="border-b border-rule">
      <ul className="mx-auto max-w-[1240px] px-4 sm:px-6 py-4 flex gap-x-7 gap-y-2 overflow-x-auto sm:flex-wrap sm:justify-center text-sm text-muted">
        {TRUST.map((t) => (
          <li key={t.en} className="flex items-center gap-2 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt" aria-hidden="true">
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tx(t, lang)}
          </li>
        ))}
      </ul>
    </div>
  );
}

const STEPS: { title: T; body: T }[] = [
  {
    title: { en: "Pick a template or type an idea", ar: "اختر قالبًا أو اكتب فكرتك" },
    body: { en: "Menus, products, real estate, posters. Or describe anything in English or Arabic.", ar: "قوائم، منتجات، عقارات، ملصقات. أو صِف أي شيء بالعربية أو الإنجليزية." },
  },
  {
    title: { en: "Add your photo", ar: "أضف صورتك" },
    body: { en: "A phone snap is enough. Your product stays the same; everything around it gets the pro treatment.", ar: "صورة من الهاتف تكفي. منتجك يبقى كما هو، وكل ما حوله يصبح احترافيًا." },
  },
  {
    title: { en: "Download and post", ar: "حمّل وانشر" },
    body: { en: "Ready in seconds, saved to your Library. Upscale, remove the background or turn it into a video.", ar: "جاهزة خلال ثوانٍ ومحفوظة في مكتبتك. كبّرها أو أزل الخلفية أو حوّلها إلى فيديو." },
  },
];

export function HowItWorks({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  return (
    <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-20">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "كيف يعمل" : "How it works"}</p>
      <h2 className="text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1 max-w-[20ch]">
        {ar ? "من صورة هاتف إلى منشور احترافي." : "From phone snap to pro post."}
      </h2>
      <ol className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title.en} className="glass rounded-[24px] p-5 sm:p-6">
            <span className="grid place-items-center h-10 w-10 rounded-full bg-cobalt text-cobalt-ink font-extrabold text-lg">{i + 1}</span>
            <h3 className="mt-4 text-lg font-bold">{tx(s.title, lang)}</h3>
            <p className="mt-1.5 text-muted text-[15px]">{tx(s.body, lang)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

const FAQ: { q: T; a: T }[] = [
  {
    q: { en: "How do credits work?", ar: "كيف يعمل الرصيد؟" },
    a: {
      en: "Each creation costs a few credits, and the price is shown on the button before you tap. Most photos cost 1–3 credits; a 5-second video starts at 10. New accounts get free credits to try, once per person and device.",
      ar: "كل إنشاء يكلّف بضعة أرصدة، والسعر ظاهر على الزر قبل الضغط. معظم الصور تكلّف 1–3 أرصدة، والفيديو من 5 ثوانٍ يبدأ من 10. الحسابات الجديدة تحصل على رصيد مجاني للتجربة، مرة واحدة لكل شخص وجهاز.",
    },
  },
  {
    q: { en: "How do I pay?", ar: "كيف أدفع؟" },
    a: {
      en: "Pick a pack on the Credits page and it opens WhatsApp with your order ready. Pay the way that suits you, and the credits are added to your account within minutes.",
      ar: "اختر باقة من صفحة الرصيد فيفتح واتساب وطلبك جاهز. ادفع بالطريقة التي تناسبك، ويُضاف الرصيد إلى حسابك خلال دقائق.",
    },
  },
  {
    q: { en: "Can I use the results for my business?", ar: "هل يمكنني استخدام النتائج لعملي؟" },
    a: {
      en: "Yes. Post them on your pages, menus, website and ads.",
      ar: "نعم. انشرها على صفحاتك وقوائمك وموقعك وإعلاناتك.",
    },
  },
  {
    q: { en: "Who can see my photos?", ar: "من يرى صوري؟" },
    a: {
      en: "Your creations live in your Library and aren't listed anywhere unless you share one to Explore. Photos you upload for editing are deleted right after the job.",
      ar: "إبداعاتك محفوظة في مكتبتك ولا تظهر في أي مكان إلا إذا شاركتها في استكشف. الصور التي ترفعها للتعديل تُحذف فور انتهاء العمل.",
    },
  },
  {
    q: { en: "What if a creation fails?", ar: "ماذا لو فشل الإنشاء؟" },
    a: {
      en: "Your credits come back automatically. Try again, or pick another model.",
      ar: "يعود رصيدك تلقائيًا. حاول مرة أخرى أو اختر نموذجًا آخر.",
    },
  },
  {
    q: { en: "Can I write in Arabic?", ar: "هل يمكنني الكتابة بالعربية؟" },
    a: {
      en: "Yes. Write your idea in Arabic and PostKit translates it for the model behind the scenes. The whole site also works in Arabic.",
      ar: "نعم. اكتب فكرتك بالعربية وPostKit يترجمها للنموذج تلقائيًا. والموقع كله متاح بالعربية.",
    },
  },
];

export function Faq({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  return (
    <section id="faq" className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-20 scroll-mt-24 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8">
      <div>
        <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "أسئلة" : "FAQ"}</p>
        <h2 className="text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">{ar ? "أسئلة شائعة" : "Good questions"}</h2>
        <p className="text-muted mt-2">{ar ? "لم تجد جوابك؟ راسلنا على واتساب من صفحة الرصيد." : "Didn't find yours? Message us on WhatsApp from the Credits page."}</p>
      </div>
      <ul className="glass rounded-[24px] divide-y divide-rule">
        {FAQ.map((f) => (
          <li key={f.q.en}>
            <details className="group px-5 py-4">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-semibold text-[16px] [&::-webkit-details-marker]:hidden">
                {tx(f.q, lang)}
                <span className="grid place-items-center h-7 w-7 shrink-0 rounded-full border border-rule text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="text-muted text-[15px] mt-2 pe-8">{tx(f.a, lang)}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FinalCta({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  return (
    <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-20">
      <div className="relative overflow-hidden rounded-[32px] glass px-6 sm:px-12 py-12 sm:py-16 text-center">
        <div className="neon-field opacity-80" aria-hidden="true" />
        <div className="relative z-10">
          <h2 className="text-[34px] sm:text-[52px] font-extrabold tracking-[-0.035em] leading-[1.02] max-w-[18ch] mx-auto">
            {ar ? "منشورك القادم على بُعد نقرة." : "Your next post is one tap away."}
          </h2>
          <p className="text-muted mt-3 max-w-[46ch] mx-auto">
            {ar ? `ابدأ مجانًا مع ${WELCOME_CREDITS} أرصدة. بلا بطاقة، بلا اشتراك.` : `Start free with ${WELCOME_CREDITS} credits. No card, no subscription.`}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/create" className="tap btn-neon inline-flex h-12 items-center rounded-full px-7 text-[15px] font-semibold">
              {ar ? "ابدأ الإنشاء" : "Start creating"}
            </Link>
            <Link href="/templates" className="tap inline-flex h-12 items-center rounded-full px-7 text-[15px] font-semibold border border-rule bg-paper/40 hover:border-ink/40">
              {ar ? "تصفّح القوالب" : "Browse templates"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

const SOCIAL: { href: string; icon: string; t: T; b: T }[] = [
  { href: "/pack", icon: "▦", t: { en: "Post Pack", ar: "باقة المنشور" }, b: { en: "Feed + story + reel + caption from one photo", ar: "منشور وستوري وريل وتعليق من صورة واحدة" } },
  { href: "/talk", icon: "◉", t: { en: "Talking product", ar: "منتج يتكلّم" }, b: { en: "Your photo says your line, in Arabic or English", ar: "صورتك تقول جملتك بالعربي أو الإنجليزي" } },
  { href: "/captions", icon: "✎", t: { en: "Lebanese captions", ar: "تعليقات لبنانية" }, b: { en: "Arabizi, Arabic or the Beirut mix", ar: "عربيزي، عربي، أو مزيج بيروتي" } },
  { href: "/menu", icon: "☰", t: { en: "Menu maker", ar: "صانع القوائم" }, b: { en: "Bilingual menus for print and Instagram", ar: "قوائم بلغتين للطباعة وإنستغرام" } },
];

/** Promo for the Social studio tools. */
export function SocialStrip({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  return (
    <section className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-20">
      <div className="relative overflow-hidden rounded-[32px] glass p-6 sm:p-10">
        <div className="neon-field opacity-60" aria-hidden="true" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 items-center">
          <div>
            <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "جديد · استوديو السوشيال" : "New · Social studio"}</p>
            <h2 className="text-[32px] sm:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.03] mt-1">
              {ar ? "أدوات لن تجدها في أي موقع آخر." : "Tools you won't find anywhere else."}
            </h2>
            <p className="text-muted mt-2 max-w-[44ch]">
              {ar ? "صُمّمت لصفحات المحلات والمطاعم في لبنان: من الصورة إلى المنشور الجاهز." : "Built for shop and restaurant pages in Lebanon: from photo to ready-to-post."}
            </p>
            <Link href="/social" className="tap btn-neon mt-5 inline-flex h-12 items-center rounded-full px-6 text-[15px] font-semibold">
              {ar ? "افتح استوديو السوشيال" : "Open Social studio"}
            </Link>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SOCIAL.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="tap flex items-start gap-3 rounded-[22px] bg-paper/50 border border-rule p-4 h-full hover:border-cobalt/50">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-cobalt/15 text-cobalt font-bold shrink-0">{s.icon}</span>
                  <span>
                    <span className="block font-bold">{tx(s.t, lang)}</span>
                    <span className="block text-sm text-muted">{tx(s.b, lang)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
