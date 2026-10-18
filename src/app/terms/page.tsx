import type { Metadata } from "next";
import { t as dict } from "@/lib/i18n";

export const metadata: Metadata = { title: "Terms and refunds — PostKit" };

export default function TermsPage() {
  const t = dict.terms;

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
