import { notFound } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDict(locale).terms;

  return (
    <div className="page">
      <div className="wrap terms">
        <h1 className="page__title">{t.title}</h1>
        <p className="page__lede">{t.updated}</p>
        {t.sections.map((s) => (
          <section key={s.h}>
            <h2>{s.h}</h2>
            <p>{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
