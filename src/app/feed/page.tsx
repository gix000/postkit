import type { Metadata } from "next";
import FeedPreview from "./FeedClient";
import { listMine } from "@/lib/creations";
import { getViewer } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { lang } = await getT();
  return { title: lang === "ar" ? "معاينة الصفحة" : "Feed preview" };
}

export default async function FeedPage() {
  const [{ lang }, viewer] = await Promise.all([getT(), getViewer()]);
  const mine = viewer ? await listMine(undefined, 60) : [];
  const ar = lang === "ar";
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 pb-10">
      <p className="text-sm font-semibold text-cobalt tracking-wide uppercase">{ar ? "استوديو السوشيال" : "Social studio"}</p>
      <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] mt-1">{ar ? "معاينة صفحتك" : "Preview your feed"}</h1>
      <p className="text-muted mt-2 mb-8 max-w-[56ch]">
        {ar ? "شاهد كيف ستبدو صفحتك قبل أن تنشر، ورتّب الصور حتى تتناسق." : "See how your page will look before you post, and arrange photos until the grid flows."}
      </p>
      <FeedPreview signedIn={Boolean(viewer)} creations={mine.map((c) => ({ key: c.id, url: c.url, kind: c.kind }))} />
    </div>
  );
}
