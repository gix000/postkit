import { notFound, redirect } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

/** Only same-site paths for this locale are allowed as a destination. */
function safeNext(next: string | undefined, locale: string) {
  return next && next.startsWith(`/${locale}/`) && !next.startsWith("//") ? next : `/${locale}/account`;
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const next = safeNext((await searchParams).next, locale);
  if (await getUser()) redirect(next);
  const t = getDict(locale);

  return (
    <div className="page">
      <div className="wrap">
        <h1 className="page__title">{t.login.title}</h1>
        <p className="page__lede">{t.login.lede}</p>
        <LoginForm t={t.login} next={next} />
      </div>
    </div>
  );
}
