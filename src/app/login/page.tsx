import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

/** Only same-site paths are allowed as a destination. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/account";
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getUser()) redirect(next);

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
